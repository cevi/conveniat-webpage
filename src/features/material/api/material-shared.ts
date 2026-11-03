import { isMaterialTeam } from '@/features/material/api/material-access';
import { materialErrorTexts } from '@/features/material/error-texts';
import {
  getAvailableForPeriod,
  getItemStatus,
  getStockSummary,
  type LoanHold,
  type MaterialItemStatus,
  type StockSummary,
} from '@/features/material/utils/stock';
import type { MaterialLoanStatus, Prisma, PrismaClient } from '@/lib/prisma/client';
import { createErrorThrower } from '@/trpc/error-formatter';
import type { HitobitoNextAuthUser } from '@/types/hitobito-next-auth-user';
import type { TRPCError } from '@trpc/server';

export type MaterialPrisma = PrismaClient | Prisma.TransactionClient;

/** Loans that keep pieces away from the stock. */
export const HOLDING_STATUSES: MaterialLoanStatus[] = ['REQUESTED', 'RESERVED', 'ISSUED'];

/** Asked for or confirmed, not handed out yet: what can still be changed or cancelled. */
export const PENDING_STATUSES: MaterialLoanStatus[] = ['REQUESTED', 'RESERVED'];

export const holdSelect = {
  status: true,
  quantity: true,
  issuedQuantity: true,
  isConsumption: true,
  startDate: true,
  endDate: true,
} satisfies Prisma.MaterialLoanSelect;

export const loanInclude = {
  item: {
    select: {
      id: true,
      code: true,
      name: true,
      unit: true,
      imageUrl: true,
      isConsumable: true,
      returnInstructions: true,
      maxLoanQuantity: true,
      orderStep: true,
    },
  },
  person: { select: { uuid: true, name: true } },
} satisfies Prisma.MaterialLoanInclude;

export type MaterialLoanWithRelations = Prisma.MaterialLoanGetPayload<{
  include: typeof loanInclude;
}>;

/** A refusal the material components translate, with `{n}` and `{item}` filled in. */
const throwMaterialError = createErrorThrower(materialErrorTexts);

export const materialError = (
  code: TRPCError['code'],
  reason: keyof typeof materialErrorTexts,
  n?: number,
  item?: string,
): TRPCError =>
  throwMaterialError(code, reason, {
    ...(n === undefined ? {} : { n }),
    ...(item === undefined ? {} : { item }),
  });

/**
 * Serialises every write that changes what an article can promise. Without the row lock two
 * requests could both read "one tent left" and both be accepted.
 */
export const lockItem = async (tx: Prisma.TransactionClient, itemId: string): Promise<void> => {
  await tx.$queryRaw`SELECT 1 FROM "MaterialItem" WHERE id = ${itemId} FOR UPDATE`;
};

/**
 * Locks several articles for one basket, always in ascending id order: two baskets that share
 * articles then queue behind each other instead of each holding one lock the other waits for.
 */
export const lockItems = async (
  tx: Prisma.TransactionClient,
  itemIds: Iterable<string>,
): Promise<void> => {
  for (const itemId of [...new Set(itemIds)].toSorted()) await lockItem(tx, itemId);
};

/**
 * Loans the user may see: all of them for the material team, otherwise the ones they asked
 * for, the ones booked on them and the ones of their Höfe. The Höfe are only read when needed.
 */
export const visibleLoansWhere = async (
  user: HitobitoNextAuthUser,
  myHofIds: () => Promise<string[]>,
): Promise<Prisma.MaterialLoanWhereInput> =>
  isMaterialTeam(user)
    ? {}
    : {
        OR: [
          { createdById: user.uuid },
          { personId: user.uuid },
          { hofId: { in: await myHofIds() } },
        ],
      };

export interface MaterialItemWithStock {
  id: string;
  code: string;
  name: string;
  description: string;
  usageNotes: string | null;
  returnInstructions: string;
  imageUrl: string | null;
  unit: string;
  category: { id: string; name: string };
  totalQuantity: number;
  maxLoanQuantity: number;
  orderStep: number;
  damagedQuantity: number;
  inRepairQuantity: number;
  lowStockThreshold: number;
  isConsumable: boolean;
  isReservable: boolean;
  isDisabled: boolean;
  stock: StockSummary;
  status: MaterialItemStatus;
}

/** An article with its stock, and the open loans the stock was worked out from. */
export interface MaterialItemStockEntry {
  item: MaterialItemWithStock;
  holds: LoanHold[];
}

/** Articles with the stock worked out from their open loans. */
export const loadItemsWithStock = async (
  prisma: MaterialPrisma,
  where: Prisma.MaterialItemWhereInput = {},
): Promise<MaterialItemStockEntry[]> => {
  const items = await prisma.materialItem.findMany({
    where,
    orderBy: { name: 'asc' },
    select: {
      id: true,
      code: true,
      name: true,
      description: true,
      usageNotes: true,
      returnInstructions: true,
      imageUrl: true,
      unit: true,
      category: { select: { id: true, name: true } },
      totalQuantity: true,
      maxLoanQuantity: true,
      orderStep: true,
      damagedQuantity: true,
      inRepairQuantity: true,
      lowStockThreshold: true,
      isConsumable: true,
      isReservable: true,
      isDisabled: true,
      loans: { where: { status: { in: HOLDING_STATUSES } }, select: holdSelect },
    },
  });

  return items.map(({ loans, ...item }) => {
    const stock = getStockSummary(item, loans);
    return { item: { ...item, stock, status: getItemStatus(item, stock) }, holds: loans };
  });
};

/**
 * Throws unless `quantity` pieces of the article are free for the whole period. Call it inside
 * a transaction after `lockItem`.
 */
export const assertAvailable = async ({
  tx,
  itemId,
  quantity,
  startDate,
  endDate,
  excludeLoanId,
}: {
  tx: Prisma.TransactionClient;
  itemId: string;
  quantity: number;
  startDate: Date;
  endDate: Date;
  excludeLoanId?: string;
}): Promise<void> => {
  if (endDate < startDate) throw materialError('BAD_REQUEST', 'period');

  const item = await tx.materialItem.findUnique({
    where: { id: itemId },
    include: {
      loans: {
        where: {
          status: { in: HOLDING_STATUSES },
          ...(excludeLoanId === undefined ? {} : { id: { not: excludeLoanId } }),
        },
        select: holdSelect,
      },
    },
  });
  if (!item) throw materialError('NOT_FOUND', 'itemNotFound');
  if (item.isDisabled) throw materialError('BAD_REQUEST', 'disabled', 0, item.name);
  if (quantity > item.maxLoanQuantity) {
    throw materialError('BAD_REQUEST', 'overMax', item.maxLoanQuantity, item.name);
  }

  const available = getAvailableForPeriod(
    item,
    item.loans,
    { start: startDate, end: endDate },
    new Date(),
  );
  if (quantity > available) {
    throw materialError('CONFLICT', 'notEnough', available, item.name);
  }
};

/** Pieces handed out and not back yet; used-up consumables already left the total. */
export const getIssuedQuantity = async (
  tx: Prisma.TransactionClient,
  itemId: string,
): Promise<number> => {
  const { _sum } = await tx.materialLoan.aggregate({
    where: { itemId, status: 'ISSUED', isConsumption: false },
    _sum: { issuedQuantity: true },
  });
  return _sum.issuedQuantity ?? 0;
};

/**
 * Usable pieces physically on the shelf. Anything that shrinks the stock right away, a loss,
 * a damage or a consumption, can only take from these; what is out is settled at its return.
 */
export const getInDepotQuantity = async (
  tx: Prisma.TransactionClient,
  item: { id: string; totalQuantity: number; damagedQuantity: number; inRepairQuantity: number },
): Promise<number> =>
  item.totalQuantity -
  item.damagedQuantity -
  item.inRepairQuantity -
  (await getIssuedQuantity(tx, item.id));
