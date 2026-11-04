import { formatChf, OVERPAYMENT_TOLERANCE, toRappen } from '@/features/billing-core/money';
import type { BillPayment } from '@/features/payload-cms/payload-types';

/**
 * How much of which payment counts for which bill.
 *
 * A payment is assigned by its allocations, not by its reference: the import allocates it to
 * the bill whose reference it carries, and finance can move it to another bill or split it,
 * as when a mother pays both children's bills with one of the two references. Whatever the
 * allocations say is what a bill counts as paid. A refunded payment counts for nothing.
 *
 * An allocation points to a bill of any kind, a camp bill or a Besuchstag bill, through the
 * polymorphic `bill`. Payments stored before there were two kinds name a camp bill in the
 * legacy `participant` instead, which is read where `bill` is missing; a later migration
 * removes it. Bills are told apart by their id alone, which is unique across collections.
 *
 * Kept free of Payload runtime imports, so the arithmetic can be tested on its own.
 */

/** The collection of the camp bills, which every payment from before the Besuchstag names. */
export const CAMP_BILL_COLLECTION = 'bill-participants';

type Allocation = NonNullable<BillPayment['allocations']>[number];

export type AllocatablePayment = Pick<
  BillPayment,
  'transactionReference' | 'amount' | 'bookingDate' | 'refundedDate' | 'allocations'
> & { id?: string };

/** The id a relationship holds, whether Payload returned it populated or not. */
export const relationId = (value: unknown): string | undefined => {
  if (typeof value === 'string' && value !== '') return value;
  if (value !== null && typeof value === 'object') {
    const id = (value as { id?: unknown }).id;
    if (typeof id === 'string' && id !== '') return id;
  }
  return undefined;
};

/** A bill a payment points to: its collection and its id. */
export interface BillReference {
  relationTo: string;
  id: string;
}

/** The bill a polymorphic relationship holds, populated or not. */
export const billReferenceOf = (value: unknown): BillReference | undefined => {
  if (value === null || typeof value !== 'object' || !('relationTo' in value)) return undefined;
  const { relationTo } = value;
  const id = relationId((value as { value?: unknown }).value);
  return typeof relationTo === 'string' && id !== undefined ? { relationTo, id } : undefined;
};

/** The bill an allocation pays, from `bill` or, on an older payment, `participant`. */
export const allocationBill = (allocation: Partial<Allocation>): BillReference | undefined => {
  const bill = billReferenceOf(allocation.bill);
  if (bill !== undefined) return bill;
  const legacy = relationId(allocation.participant);
  return legacy === undefined ? undefined : { relationTo: CAMP_BILL_COLLECTION, id: legacy };
};

/** The bill whose reference a payment carried, from `matchedBill` or `matchedParticipant`. */
export const matchedBillOf = (
  payment: Partial<Pick<BillPayment, 'matchedBill' | 'matchedParticipant'>>,
): BillReference | undefined => {
  const bill = billReferenceOf(payment.matchedBill);
  if (bill !== undefined) return bill;
  const legacy = relationId(payment.matchedParticipant);
  return legacy === undefined ? undefined : { relationTo: CAMP_BILL_COLLECTION, id: legacy };
};

/** Every bill a payment is allocated to, of one collection or of all. */
export const allocatedBillIds = (
  payment: Pick<BillPayment, 'allocations'> | null | undefined,
  collection?: string,
): string[] => [
  ...new Set(
    (payment?.allocations ?? [])
      .map((allocation) => allocationBill(allocation))
      .filter((bill) => bill !== undefined)
      .filter((bill) => collection === undefined || bill.relationTo === collection)
      .map((bill) => bill.id),
  ),
];

/** Whether a payment still counts, which a refund ends. */
export const isRefunded = (payment: Pick<BillPayment, 'refundedDate'>): boolean =>
  typeof payment.refundedDate === 'string' && payment.refundedDate !== '';

/** The share of one payment allocated to one bill, in Rappen; zero once refunded. */
export const allocatedTo = (
  payment: Pick<BillPayment, 'allocations' | 'refundedDate'>,
  billId: string,
): number =>
  isRefunded(payment)
    ? 0
    : (payment.allocations ?? [])
        .filter((allocation) => allocationBill(allocation)?.id === billId)
        .reduce((sum, allocation) => sum + toRappen(allocation.amount), 0);

/**
 * The payments that count for a bill, oldest booking first. Payments booked the same day go
 * by transaction, so the same payments always settle a bill in the same order.
 */
export const paymentsCountingFor = <T extends AllocatablePayment>(
  payments: T[],
  billId: string,
): T[] =>
  payments
    .filter((payment) => allocatedTo(payment, billId) > 0)
    .toSorted((a, b) => {
      const byDate = (a.bookingDate ?? '').localeCompare(b.bookingDate ?? '');
      return byDate === 0 ? a.transactionReference.localeCompare(b.transactionReference) : byDate;
    });

/**
 * The first payments that together pay a bill, oldest first; empty while they fall short.
 *
 * A bill is booked with these, whether the payments after them arrive in the same bank file
 * or a later one: what comes after is the double payment, not part of the booking.
 */
export const settlingPayments = <T extends AllocatablePayment>(
  counting: T[],
  billId: string,
  invoiceRappen: number,
): T[] => {
  let paid = 0;
  for (const [index, payment] of counting.entries()) {
    paid += allocatedTo(payment, billId);
    if (paid >= invoiceRappen) return counting.slice(0, index + 1);
  }
  return [];
};

/** What all payments together pay towards a bill, in Rappen. */
export const totalAllocatedTo = (payments: AllocatablePayment[], billId: string): number =>
  payments.reduce((sum, payment) => sum + allocatedTo(payment, billId), 0);

/**
 * Whether a bill got more than it asks for, beyond what the import books as rounding.
 *
 * Two payments of the full amount, a second one of any size, or a split that gave one bill
 * too much all read the same: money that has to go back or on to another bill.
 */
export const isDoublePayment = (
  allocatedRappen: number,
  invoiceAmount: number | null | undefined,
): boolean =>
  invoiceAmount !== null &&
  invoiceAmount !== undefined &&
  allocatedRappen - toRappen(invoiceAmount) > toRappen(OVERPAYMENT_TOLERANCE);

/** Why the allocations of a payment cannot be saved, or `undefined` when they can. */
export const describeAllocationProblem = (
  payment: Pick<BillPayment, 'amount' | 'allocations'>,
): string | undefined => {
  const allocations = payment.allocations ?? [];
  if (allocations.some((allocation) => toRappen(allocation.amount) <= 0)) {
    return 'Jede Zuordnung braucht einen Betrag über CHF 0.00.';
  }
  const ids = allocations.map((allocation) => allocationBill(allocation)?.id);
  if (new Set(ids).size !== ids.length) {
    return 'Jede Rechnung darf nur einmal zugeordnet werden. Beträge für dieselbe Rechnung bitte zusammenzählen.';
  }
  const allocated = allocations.reduce((sum, allocation) => sum + toRappen(allocation.amount), 0);
  if (allocated > toRappen(payment.amount)) {
    return (
      `Zugeordnet sind ${formatChf(allocated / 100)}, die Zahlung beträgt aber nur ` +
      `${formatChf(payment.amount)}.`
    );
  }
  return undefined;
};
