import { isMaterialTeam } from '@/features/material/api/material-access';
import {
  getAvailableForPeriod,
  getItemStatus,
  getStockSummary,
  type LoanHold,
  type MaterialItemStatus,
  type StockSummary,
} from '@/features/material/utils/stock';
import type { MaterialLoanStatus, Prisma, PrismaClient } from '@/lib/prisma/client';
import type { HitobitoNextAuthUser } from '@/types/hitobito-next-auth-user';
import type { Locale, StaticTranslationString } from '@/types/types';
import { TRPCError } from '@trpc/server';

export type MaterialPrisma = PrismaClient | Prisma.TransactionClient;

/** Loans that keep pieces away from the stock. */
export const HOLDING_STATUSES: MaterialLoanStatus[] = ['REQUESTED', 'RESERVED', 'ISSUED'];

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
  department: { select: { id: true, name: true, shortName: true } },
  person: { select: { uuid: true, name: true } },
  createdBy: { select: { uuid: true, name: true } },
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
    de: 'Für diesen Zeitraum sind nur noch {n} verfügbar.',
    en: 'Only {n} are available for this period.',
    fr: 'Seulement {n} disponibles pour cette période.',
  },
  overMax: {
    de: 'Pro Ausleihe sind höchstens {n} erlaubt.',
    en: 'At most {n} are allowed per loan.',
    fr: 'Au maximum {n} par prêt.',
  },
  period: {
    de: 'Die Rückgabe muss nach der Ausleihe liegen.',
    en: 'The return has to be after the start.',
    fr: 'Le retour doit être après le début.',
  },
  disabled: {
    de: 'Dieser Artikel kann zurzeit nicht ausgeliehen werden.',
    en: 'This item cannot be borrowed at the moment.',
    fr: 'Cet article ne peut pas être emprunté pour le moment.',
  },
  notReservable: {
    de: 'Dieser Artikel wird nur direkt im Materialdepot ausgegeben.',
    en: 'This item is only handed out at the material depot.',
    fr: 'Cet article est remis uniquement au dépôt de matériel.',
  },
  notConsumable: {
    de: 'Nur Verbrauchsmaterial kann verbraucht werden.',
    en: 'Only consumables can be used up.',
    fr: 'Seul le matériel de consommation peut être consommé.',
  },
  wrongStatus: {
    de: 'Diese Aktion ist im aktuellen Status nicht möglich.',
    en: 'This action is not possible in the current status.',
    fr: 'Cette action n’est pas possible dans le statut actuel.',
  },
  notOwnDepartment: {
    de: 'Du kannst nur für deine eigene Abteilung reservieren. Für andere wende dich ans Materialteam.',
    en: 'You can only book for your own department. Ask the material team for others.',
    fr: 'Tu ne peux réserver que pour ton propre groupe. Pour les autres, adresse-toi à l’équipe matériel.',
  },
  notSelf: {
    de: 'Als Einzelperson kannst du nur auf dich selbst reservieren.',
    en: 'As a single person you can only book for yourself.',
    fr: 'En tant que personne, tu ne peux réserver que pour toi.',
  },
  tooManyRequests: {
    de: 'Du hast schon {n} offene Anfragen. Warte, bis das Materialteam sie bestätigt.',
    en: 'You already have {n} open requests. Wait until the material team confirms them.',
    fr: 'Tu as déjà {n} demandes ouvertes. Attends que l’équipe matériel les confirme.',
  },
  notOnShelf: {
    de: 'Im Depot liegen nur noch {n} brauchbare Stück.',
    en: 'Only {n} usable pieces are left in the depot.',
    fr: 'Il ne reste que {n} pièces utilisables au dépôt.',
  },
  personNotFound: {
    de: 'Person nicht gefunden.',
    en: 'Person not found.',
    fr: 'Personne introuvable.',
  },
  departmentNotFound: {
    de: 'Abteilung nicht gefunden.',
    en: 'Department not found.',
    fr: 'Groupe introuvable.',
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

/** A user-facing error in the caller's language. */
export const materialError = (
  code: TRPCError['code'],
  key: keyof typeof errors,
  locale: Locale,
  n?: number,
): TRPCError =>
  new TRPCError({
    code,
    message: errors[key][locale].replace('{n}', String(n ?? '')),
  });

/**
 * Serialises every write that changes what an article can promise. Without the row lock two
 * requests could both read "one tent left" and both be accepted.
 */
export const lockItem = async (tx: Prisma.TransactionClient, itemId: string): Promise<void> => {
  await tx.$queryRaw`SELECT 1 FROM "MaterialItem" WHERE id = ${itemId} FOR UPDATE`;
};

/** Loans the user may see: all of them for the material team, otherwise their own. */
export const visibleLoansWhere = (user: HitobitoNextAuthUser): Prisma.MaterialLoanWhereInput =>
  isMaterialTeam(user)
    ? {}
    : {
        OR: [
          { createdById: user.uuid },
          { personId: user.uuid },
          { department: { hitobitoGroupId: { in: user.group_ids } } },
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
  if (item.isDisabled) throw materialError('BAD_REQUEST', 'disabled', locale);
  if (quantity > item.maxLoanQuantity) {
    throw materialError('BAD_REQUEST', 'overMax', locale, item.maxLoanQuantity);
  }

  const available = getAvailableForPeriod(
    item,
    item.loans,
    { start: startDate, end: endDate },
    new Date(),
  );
  if (quantity > available) throw materialError('CONFLICT', 'notEnough', locale, available);
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
