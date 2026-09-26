import {
  isMaterialTeam,
  materialProcedure,
  materialTeamProcedure,
} from '@/features/material/api/material-access';
import { listHoefe, withHof, type LoanHof } from '@/features/material/api/material-hoefe';
import {
  createIncidentPhotoUploadUrl,
  createLoanBasket,
  issueLoanList,
  reportIncident,
  returnLoanBasket,
} from '@/features/material/api/material-loan-mutations';
import {
  HOLDING_STATUSES,
  loadItemsWithStock,
  loanInclude,
  materialError,
  type MaterialLoanWithRelations,
  type MaterialPrisma,
} from '@/features/material/api/material-shared';
import {
  adjustItemStock,
  createCategory,
  createItem,
  resolveIncident,
  updateCategory,
  updateItem,
} from '@/features/material/api/material-team-mutations';
import { buildCounterQueue, holderKey, holderOf } from '@/features/material/utils/holders';
import { getPeakHeldQuantity } from '@/features/material/utils/stock';
import type { Prisma } from '@/lib/prisma/client';
import { S3_BUCKET_NAME, s3ClientPublic } from '@/lib/s3';
import { createTRPCRouter } from '@/trpc/init';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { z } from 'zod';

export type MaterialStockAlert =
  | { kind: 'LOW_STOCK'; itemCode: string; itemName: string; available: number }
  | { kind: 'DAMAGED'; itemCode: string; itemName: string; quantity: number }
  | { kind: 'IN_REPAIR'; itemCode: string; itemName: string; quantity: number }
  | { kind: 'OVERBOOKED'; itemCode: string; itemName: string; missing: number };

/**
 * "Today" is the reader's day, not the server's, so the client sends where its day ends. The
 * key of the query changes once a day, which is as often as the answer should.
 */
const dayInput = z.object({ dayEnd: z.date() });

/** Everything prepared or out, with the name of its Hof. */
const loadOpenLoans = async (
  prisma: MaterialPrisma,
): Promise<(MaterialLoanWithRelations & { hof: LoanHof | null })[]> =>
  await withHof(
    await prisma.materialLoan.findMany({
      where: { status: { in: HOLDING_STATUSES } },
      include: loanInclude,
      orderBy: { number: 'asc' },
    }),
  );

const incidentInclude = {
  item: { select: { code: true, name: true } },
  loan: { select: { number: true } },
  reportedBy: { select: { name: true } },
} satisfies Prisma.MaterialIncidentInclude;

type IncidentRow = Prisma.MaterialIncidentGetPayload<{ include: typeof incidentInclude }>;

/** Open damage reports, newest first, with a photo link that holds for an hour. */
const loadIncidents = async (
  prisma: MaterialPrisma,
): Promise<(IncidentRow & { photoUrl: string | null })[]> => {
  const incidents = await prisma.materialIncident.findMany({
    // eslint-disable-next-line unicorn/no-null -- Prisma matches a SQL NULL only through null
    where: { resolvedAt: null },
    include: incidentInclude,
    orderBy: { createdAt: 'desc' },
  });
  return await Promise.all(
    incidents.map(async (incident) => ({
      ...incident,
      photoUrl:
        incident.photoKey === null
          ? // eslint-disable-next-line unicorn/no-null -- mirrors the nullable photoKey column
            null
          : await getSignedUrl(
              s3ClientPublic,
              new GetObjectCommand({ Bucket: S3_BUCKET_NAME, Key: incident.photoKey }),
              { expiresIn: 3600 },
            ),
    })),
  );
};

export const materialRouter = createTRPCRouter({
  /** Who is asking, and which Höfe they lead or are registered for. */
  getMe: materialProcedure.query(async ({ ctx }) => {
    const [hoefe, mine] = await Promise.all([listHoefe(), ctx.myHofIds()]);
    return {
      uuid: ctx.user.uuid,
      name: ctx.user.nickname ?? ctx.user.name,
      isMaterialTeam: isMaterialTeam(ctx.user),
      hoefe: hoefe.filter((hof) => mine.includes(hof.id)).map(({ id, name }) => ({ id, name })),
    };
  }),

  /**
   * What a participant's Höfe and they themselves have from the depot: prepared and out. Read
   * only; the material team books everything at the counter.
   */
  getMyHofLoans: materialProcedure.query(async ({ ctx }) => {
    const [hoefe, mine] = await Promise.all([listHoefe(), ctx.myHofIds()]);
    const loans = await ctx.prisma.materialLoan.findMany({
      where: {
        status: { in: HOLDING_STATUSES },
        OR: [
          // eslint-disable-next-line unicorn/no-null -- a person's loan is theirs, not the Hof's
          { hofId: { in: mine }, personId: null },
          { personId: ctx.user.uuid },
        ],
      },
      select: {
        id: true,
        number: true,
        status: true,
        quantity: true,
        issuedQuantity: true,
        startDate: true,
        endDate: true,
        hofId: true,
        personId: true,
        item: { select: { name: true, unit: true, imageUrl: true } },
      },
      orderBy: [{ endDate: 'asc' }, { number: 'asc' }],
    });
    return {
      hoefe: hoefe
        .filter((hof) => mine.includes(hof.id))
        .map((hof) => ({
          id: hof.id,
          name: hof.name,
          loans: loans.filter((loan) => loan.personId === null && loan.hofId === hof.id),
        })),
      mine: loans.filter((loan) => loan.personId === ctx.user.uuid),
    };
  }),

  getCategoryList: materialTeamProcedure.query(async ({ ctx }) => {
    return await ctx.prisma.materialCategory.findMany({ orderBy: { sortOrder: 'asc' } });
  }),

  /** Every article with its stock, and how many holders have some of it out. */
  getInventory: materialTeamProcedure.query(async ({ ctx }) => {
    const [entries, out] = await Promise.all([
      loadItemsWithStock(ctx.prisma),
      ctx.prisma.materialLoan.findMany({
        where: { status: 'ISSUED' },
        select: { itemId: true, hofId: true, personId: true },
      }),
    ]);
    const holders = new Map<string, Set<string>>();
    for (const loan of out) {
      const holder = holderOf(loan);
      if (holder === undefined) continue;
      const set = holders.get(loan.itemId) ?? new Set<string>();
      set.add(holderKey(holder));
      holders.set(loan.itemId, set);
    }
    return entries.map(({ item }) => ({ ...item, outHolders: holders.get(item.id)?.size ?? 0 }));
  }),

  /** One article in full, with every loan that holds some of it. */
  getItem: materialTeamProcedure
    .input(z.object({ code: z.string() }))
    .query(async ({ ctx, input }) => {
      const [entry] = await loadItemsWithStock(ctx.prisma, { code: input.code });
      if (!entry) throw materialError('NOT_FOUND', 'itemNotFound', ctx.locale);
      const openLoans = await ctx.prisma.materialLoan.findMany({
        where: { itemId: entry.item.id, status: { in: HOLDING_STATUSES } },
        include: loanInclude,
        orderBy: [{ endDate: 'asc' }, { number: 'asc' }],
      });
      return { ...entry.item, openLoans: await withHof(openLoans) };
    }),

  /** People to lend to by name. */
  searchPersonList: materialTeamProcedure
    .input(z.object({ query: z.string().trim().max(100) }))
    .query(async ({ ctx, input }) => {
      return await ctx.prisma.user.findMany({
        where: {
          hidden: false,
          ...(input.query === '' ? {} : { name: { contains: input.query, mode: 'insensitive' } }),
        },
        select: { uuid: true, name: true },
        orderBy: { name: 'asc' },
        take: 20,
      });
    }),

  /**
   * Whom material can go to or come back from: every Hof, and the people who have something
   * out, each with how many loans they have out.
   */
  getHolderList: materialTeamProcedure.query(async ({ ctx }) => {
    const [hoefe, out] = await Promise.all([
      listHoefe(),
      ctx.prisma.materialLoan.findMany({
        where: { status: 'ISSUED' },
        select: { hofId: true, personId: true, person: { select: { name: true } } },
      }),
    ]);
    const counts = new Map<string, number>();
    const people = new Map<string, string>();
    for (const loan of out) {
      const holder = holderOf(loan);
      if (holder === undefined) continue;
      counts.set(holderKey(holder), (counts.get(holderKey(holder)) ?? 0) + 1);
      if (holder.kind === 'PERSON') people.set(holder.id, loan.person?.name ?? '');
    }
    return {
      hoefe: hoefe.map((hof) => ({
        id: hof.id,
        name: hof.name,
        out: counts.get(holderKey({ kind: 'HOF', id: hof.id })) ?? 0,
      })),
      people: [...people.entries()]
        .map(([uuid, name]) => ({
          uuid,
          name,
          out: counts.get(holderKey({ kind: 'PERSON', id: uuid })) ?? 0,
        }))
        .toSorted((a, b) => a.name.localeCompare(b.name, 'de')),
    };
  }),

  /** Everything a Hof or a person has out, for the take-back. */
  getOpenLoansForHolder: materialTeamProcedure
    .input(
      z
        .object({ hofId: z.string().min(1).optional(), personId: z.string().min(1).optional() })
        .refine((input) => (input.hofId === undefined) !== (input.personId === undefined)),
    )
    .query(async ({ ctx, input }) => {
      const { hofId, personId } = input;
      const [name, loans] = await Promise.all([
        personId === undefined
          ? listHoefe().then((hoefe) => hoefe.find((hof) => hof.id === hofId)?.name)
          : ctx.prisma.user
              .findUnique({ where: { uuid: personId }, select: { name: true } })
              .then((person) => person?.name),
        ctx.prisma.materialLoan.findMany({
          where:
            personId === undefined
              ? // eslint-disable-next-line unicorn/no-null -- a person's loan is theirs, not the Hof's
                { status: 'ISSUED', hofId: hofId ?? '', personId: null }
              : { status: 'ISSUED', personId },
          include: loanInclude,
          orderBy: [{ endDate: 'asc' }, { number: 'asc' }],
        }),
      ]);
      // eslint-disable-next-line unicorn/no-null -- a deleted Hof has no name
      return { name: name ?? null, loans: await withHof(loans) };
    }),

  /** One loan by the number on its label, to find whoever has it. */
  getLoan: materialTeamProcedure
    .input(z.object({ number: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const loan = await ctx.prisma.materialLoan.findUnique({
        where: { number: input.number },
        include: loanInclude,
      });
      if (!loan) throw materialError('NOT_FOUND', 'loanNotFound', ctx.locale);
      const [withName] = await withHof([loan]);
      if (!withName) throw materialError('NOT_FOUND', 'loanNotFound', ctx.locale);
      return withName;
    }),

  /** The counter's day: pickups ready and later, and what should come back, by holder. */
  getCounterQueue: materialTeamProcedure.input(dayInput).query(async ({ ctx, input }) => {
    return buildCounterQueue(await loadOpenLoans(ctx.prisma), input.dayEnd);
  }),

  /** The material team's start page: the day in numbers and what needs attention. */
  getDashboard: materialTeamProcedure.input(dayInput).query(async ({ ctx, input }) => {
    const now = new Date();
    const [entries, openLoans, incidents] = await Promise.all([
      loadItemsWithStock(ctx.prisma),
      loadOpenLoans(ctx.prisma),
      loadIncidents(ctx.prisma),
    ]);
    const queue = buildCounterQueue(openLoans, input.dayEnd);
    const overdue = queue.returns
      .flatMap((group) => group.loans)
      .filter((loan) => loan.endDate < now)
      .toSorted((a, b) => a.endDate.getTime() - b.endDate.getTime());
    const dueToday = queue.returns.filter((group) =>
      group.loans.some((loan) => loan.endDate >= now),
    );

    const stockAlerts: MaterialStockAlert[] = [];
    for (const { item, holds } of entries) {
      if (item.isDisabled) continue;
      const base = { itemCode: item.code, itemName: item.name };
      // a loss or damage after a pickup was prepared can leave it without pieces
      const peak = getPeakHeldQuantity(holds, { start: now, end: new Date(8.64e15) }, now);
      if (peak > item.stock.usable) {
        stockAlerts.push({ kind: 'OVERBOOKED', ...base, missing: peak - item.stock.usable });
      }
      if (item.stock.available <= item.lowStockThreshold && item.stock.usable > 0) {
        stockAlerts.push({ kind: 'LOW_STOCK', ...base, available: item.stock.available });
      }
      if (item.damagedQuantity > 0) {
        stockAlerts.push({ kind: 'DAMAGED', ...base, quantity: item.damagedQuantity });
      }
      if (item.inRepairQuantity > 0) {
        stockAlerts.push({ kind: 'IN_REPAIR', ...base, quantity: item.inRepairQuantity });
      }
    }

    return {
      pickups: queue.pickups,
      overdue,
      dueToday: {
        holders: dueToday.length,
        lines: dueToday.reduce((sum, group) => sum + group.loans.length, 0),
      },
      available: entries.reduce((sum, { item }) => sum + item.stock.available, 0),
      articles: entries.length,
      incidents,
      stockAlerts,
    };
  }),

  createLoanBasket,
  issueLoanList,
  returnLoanBasket,
  reportIncident,
  createIncidentPhotoUploadUrl,
  createItem,
  updateItem,
  adjustItemStock,
  resolveIncident,
  createCategory,
  updateCategory,
});
