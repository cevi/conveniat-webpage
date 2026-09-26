import {
  getAvailableForPeriod,
  getItemStatus,
  getStockSummary,
  type LoanHold,
  type MaterialItemStatus,
  type StockSummary,
} from '@/features/material/utils/stock';
import type { MaterialLoanStatus, Prisma, PrismaClient } from '@/lib/prisma/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { TRPCError } from '@trpc/server';

export type MaterialPrisma = PrismaClient | Prisma.TransactionClient;

/** Loans that keep pieces away from the stock. */
export const HOLDING_STATUSES: MaterialLoanStatus[] = ['RESERVED', 'ISSUED'];

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
    },
  },
  person: { select: { uuid: true, name: true } },
} satisfies Prisma.MaterialLoanInclude;

export type MaterialLoanWithRelations = Prisma.MaterialLoanGetPayload<{
  include: typeof loanInclude;
}>;

const errors = {
  itemNotFound: {
    de: 'Artikel nicht gefunden.',
    en: 'Item not found.',
    fr: 'Article introuvable.',
  },
  loanNotFound: {
    de: 'Ausleihe nicht gefunden.',
    en: 'Loan not found.',
    fr: 'Prêt introuvable.',
  },
  notEnough: {
    de: '{item}: für diesen Zeitraum sind nur noch {n} verfügbar.',
    en: '{item}: only {n} are available for this period.',
    fr: '{item} : seulement {n} disponibles pour cette période.',
  },
  overMax: {
    de: '{item}: pro Ausleihe sind höchstens {n} erlaubt.',
    en: '{item}: at most {n} are allowed per loan.',
    fr: '{item} : au maximum {n} par prêt.',
  },
  period: {
    de: 'Die Rückgabe muss nach der Ausleihe liegen.',
    en: 'The return has to be after the start.',
    fr: 'Le retour doit être après le début.',
  },
  disabled: {
    de: '{item} kann zurzeit nicht ausgeliehen werden.',
    en: '{item} cannot be borrowed at the moment.',
    fr: '{item} ne peut pas être emprunté pour le moment.',
  },
  notReservable: {
    de: '{item} wird nur sofort ausgegeben und kann nicht vorbereitet werden.',
    en: '{item} is only handed out at once and cannot be prepared ahead.',
    fr: '{item} est remis uniquement sur place et ne peut pas être préparé.',
  },
  notConsumable: {
    de: '{item} ist kein Verbrauchsmaterial und kann nicht verbraucht werden.',
    en: '{item} is not a consumable and cannot be used up.',
    fr: '{item} n’est pas du matériel de consommation.',
  },
  wrongStatus: {
    de: 'Diese Aktion ist im aktuellen Status nicht möglich.',
    en: 'This action is not possible in the current status.',
    fr: 'Cette action n’est pas possible dans le statut actuel.',
  },
  notOnShelf: {
    de: '{item}: im Depot liegen nur noch {n} brauchbare Stück.',
    en: '{item}: only {n} usable pieces are left in the depot.',
    fr: '{item} : il ne reste que {n} pièces utilisables au dépôt.',
  },
  personNotFound: {
    de: 'Person nicht gefunden.',
    en: 'Person not found.',
    fr: 'Personne introuvable.',
  },
  noHolder: {
    de: 'Wähle einen Hof oder eine Person.',
    en: 'Choose a Hof or a person.',
    fr: 'Choisis un Hof ou une personne.',
  },
  hofNotFound: {
    de: 'Hof nicht gefunden.',
    en: 'Hof not found.',
    fr: 'Hof introuvable.',
  },
  quantity: {
    de: 'Die Menge passt nicht zum Bestand.',
    en: 'The quantity does not match the stock.',
    fr: 'La quantité ne correspond pas au stock.',
  },
  duplicate: {
    de: 'Dieser Code oder Name ist bereits vergeben.',
    en: 'This code or name is already taken.',
    fr: 'Ce code ou ce nom est déjà utilisé.',
  },
} satisfies Record<string, StaticTranslationString>;

/** A user-facing error in the caller's language, with `{n}` and `{item}` filled in. */
export const materialError = (
  code: TRPCError['code'],
  key: keyof typeof errors,
  locale: Locale,
  n?: number,
  item?: string,
): TRPCError =>
  new TRPCError({
    code,
    message: errors[key][locale].replace('{n}', String(n ?? '')).replace('{item}', item ?? ''),
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
  locale,
}: {
  tx: Prisma.TransactionClient;
  itemId: string;
  quantity: number;
  startDate: Date;
  endDate: Date;
  excludeLoanId?: string;
  locale: Locale;
}): Promise<void> => {
  if (endDate < startDate) throw materialError('BAD_REQUEST', 'period', locale);

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
  if (!item) throw materialError('NOT_FOUND', 'itemNotFound', locale);
  if (item.isDisabled) throw materialError('BAD_REQUEST', 'disabled', locale, 0, item.name);
  if (quantity > item.maxLoanQuantity) {
    throw materialError('BAD_REQUEST', 'overMax', locale, item.maxLoanQuantity, item.name);
  }

  const available = getAvailableForPeriod(
    item,
    item.loans,
    { start: startDate, end: endDate },
    new Date(),
  );
  if (quantity > available) {
    throw materialError('CONFLICT', 'notEnough', locale, available, item.name);
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
