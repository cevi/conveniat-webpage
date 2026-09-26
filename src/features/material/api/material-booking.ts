/* eslint-disable unicorn/no-null */
import {
  assertAvailable,
  getInDepotQuantity,
  lockItem,
  materialError,
} from '@/features/material/api/material-shared';
import type { MaterialItem, Prisma } from '@/lib/prisma/client';
import type { Locale } from '@/types/types';
import { z } from 'zod';

export const MAX_QUANTITY = 100_000;
export const quantitySchema = z.number().int().min(1).max(MAX_QUANTITY);

/** A basket is what one Hof takes over the counter, not the whole catalogue. */
export const MAX_LINES = 100;

export const minDate = (a: Date, b: Date): Date => new Date(Math.min(a.getTime(), b.getTime()));

export type LoanWithItem = Prisma.MaterialLoanGetPayload<{ include: { item: true } }>;

/** A loan the caller may act on; `visible` narrows it for a participant, see `visibleLoansWhere`. */
export const findLoan = async (
  tx: Prisma.TransactionClient,
  id: string,
  locale: Locale,
  visible: Prisma.MaterialLoanWhereInput = {},
): Promise<LoanWithItem> => {
  const loan = await tx.materialLoan.findFirst({
    where: { AND: [{ id }, visible] },
    include: { item: true },
  });
  if (!loan) throw materialError('NOT_FOUND', 'loanNotFound', locale);
  return loan;
};

/**
 * Finds a loan and locks its article, then reads the loan again under the lock. Two taps on
 * "hand out" otherwise both pass the status check on the copy they read before waiting.
 */
export const lockLoan = async (
  tx: Prisma.TransactionClient,
  id: string,
  locale: Locale,
  visible: Prisma.MaterialLoanWhereInput = {},
): Promise<LoanWithItem> => {
  const { itemId } = await findLoan(tx, id, locale, visible);
  await lockItem(tx, itemId);
  return await findLoan(tx, id, locale, visible);
};

/** One article going out now or being prepared, as a new loan or a prepared one changed. */
export interface Booking {
  item: MaterialItem;
  quantity: number;
  isConsumption: boolean;
  mode: 'ISSUE' | 'RESERVE';
  startDate: Date;
  endDate: Date;
  /** the prepared loan this booking changes, which the stock is checked without */
  loanId?: string;
}

/**
 * Checks a booking against the article's rules and stock: free for the whole period, and for
 * a hand-out also physically on the shelf, since a promised piece may have been damaged or
 * lost since. Call it under the article's lock.
 */
export const assertBookable = async (
  tx: Prisma.TransactionClient,
  booking: Booking,
  locale: Locale,
): Promise<void> => {
  const { item } = booking;
  if (booking.isConsumption && !item.isConsumable) {
    throw materialError('BAD_REQUEST', 'notConsumable', locale, 0, item.name);
  }
  if (booking.mode === 'RESERVE' && !item.isReservable) {
    throw materialError('BAD_REQUEST', 'notReservable', locale, 0, item.name);
  }
  await assertAvailable({
    tx,
    itemId: item.id,
    quantity: booking.quantity,
    startDate: booking.startDate,
    endDate: booking.endDate,
    ...(booking.loanId === undefined ? {} : { excludeLoanId: booking.loanId }),
    locale,
  });
  if (booking.mode === 'ISSUE') {
    const onShelf = await getInDepotQuantity(tx, item);
    if (booking.quantity > onShelf) {
      throw materialError('CONFLICT', 'notOnShelf', locale, Math.max(onShelf, 0), item.name);
    }
  }
};

export type BookingFields = Pick<
  Prisma.MaterialLoanUncheckedCreateInput,
  'quantity' | 'isConsumption' | 'startDate' | 'endDate' | 'status' | 'issuedQuantity' | 'issuedAt'
>;

/**
 * The loan fields a booking sets. Handing out a consumption also takes its pieces out of the
 * stock for good, since they do not come back.
 */
export const applyBooking = async (
  tx: Prisma.TransactionClient,
  booking: Booking,
  now: Date,
): Promise<BookingFields> => {
  const issue = booking.mode === 'ISSUE';
  if (issue && booking.isConsumption) {
    await tx.materialItem.update({
      where: { id: booking.item.id },
      data: { totalQuantity: { decrement: booking.quantity } },
    });
  }
  let status: 'RESERVED' | 'ISSUED' | 'CONSUMED' = 'RESERVED';
  if (issue) status = booking.isConsumption ? 'CONSUMED' : 'ISSUED';
  return {
    quantity: booking.quantity,
    isConsumption: booking.isConsumption,
    startDate: booking.startDate,
    endDate: booking.endDate,
    status,
    issuedQuantity: issue ? booking.quantity : null,
    issuedAt: issue ? now : null,
  };
};

/** A loan has a Hof or a person; the Hof is a Payload document, so no foreign key says so. */
export const holderSchema = {
  hofId: z.string().min(1).optional(),
  personId: z.string().min(1).optional(),
};

export const hasHolder = (input: {
  hofId?: string | undefined;
  personId?: string | undefined;
}): boolean => input.hofId !== undefined || input.personId !== undefined;
