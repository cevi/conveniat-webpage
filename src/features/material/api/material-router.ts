import {
  isMaterialTeam,
  materialProcedure,
  materialTeamProcedure,
} from '@/features/material/api/material-access';
import {
  announceReturn,
  cancelLoan,
  confirmLoan,
  createIncidentPhotoUploadUrl,
  createLoan,
  issueLoan,
  reportIncident,
  returnLoan,
  updateLoan,
} from '@/features/material/api/material-loan-mutations';
import {
  HOLDING_STATUSES,
  holdSelect,
  loadItemsWithStock,
  loanInclude,
  materialError,
  visibleLoansWhere,
} from '@/features/material/api/material-shared';
import {
  adjustItemStock,
  createCategory,
  createDepartment,
  createItem,
  resolveIncident,
  updateCategory,
  updateDepartment,
  updateItem,
} from '@/features/material/api/material-team-mutations';
import { getAvailableForPeriod, getPeakHeldQuantity } from '@/features/material/utils/stock';
import { S3_BUCKET_NAME, s3ClientPublic } from '@/lib/s3';
import { createTRPCRouter } from '@/trpc/init';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { z } from 'zod';

const DAY_MS = 24 * 60 * 60 * 1000;

/** How far ahead the depot looks for hand-outs and returns. */
const LOOKAHEAD_MS = DAY_MS;

const loanListInput = z
  .object({
    itemId: z.string().optional(),
    departmentId: z.string().optional(),
    personId: z.string().optional(),
    /** only what is still requested, reserved or out, soonest due first */
    openOnly: z.boolean().optional(),
  })
  .default({});

export type MaterialWarning =
  | {
      kind: 'OVERDUE';
      loanId: string;
      loanNumber: number;
      itemName: string;
      departmentName: string;
    }
  | { kind: 'LOW_STOCK'; itemCode: string; itemName: string; available: number }
  | { kind: 'DAMAGED'; itemCode: string; itemName: string; quantity: number }
  | { kind: 'IN_REPAIR'; itemCode: string; itemName: string; quantity: number }
  | { kind: 'OVERBOOKED'; itemCode: string; itemName: string; missing: number }
  | { kind: 'MAX_REACHED'; itemCode: string; itemName: string };

export const materialRouter = createTRPCRouter({
  /** Who is asking, and which departments they belong to through Cevi.DB. */
  getMe: materialProcedure.query(async ({ ctx }) => {
    const departments = await ctx.prisma.materialDepartment.findMany({
      where: { hitobitoGroupId: { in: ctx.user.group_ids } },
      select: { id: true, name: true, shortName: true },
    });
    return {
      uuid: ctx.user.uuid,
      name: ctx.user.nickname ?? ctx.user.name,
      isMaterialTeam: isMaterialTeam(ctx.user),
      departments,
    };
  }),

  getCategoryList: materialProcedure.query(async ({ ctx }) => {
    return await ctx.prisma.materialCategory.findMany({ orderBy: { sortOrder: 'asc' } });
  }),

  getItemList: materialProcedure.query(async ({ ctx }) => {
    const entries = await loadItemsWithStock(ctx.prisma);
    return entries.map(({ item }) => item);
  }),

  getItem: materialProcedure.input(z.object({ code: z.string() })).query(async ({ ctx, input }) => {
    const [entry] = await loadItemsWithStock(ctx.prisma, { code: input.code });
    if (!entry) throw materialError('NOT_FOUND', 'itemNotFound', ctx.locale);
    const { item } = entry;

    const openLoans = await ctx.prisma.materialLoan.findMany({
      where: {
        AND: [{ itemId: item.id, status: { in: HOLDING_STATUSES } }, visibleLoansWhere(ctx.user)],
      },
      include: loanInclude,
      orderBy: { startDate: 'asc' },
    });
    return { ...item, openLoans };
  }),

  /** Free pieces for a period, so the request form can say so before anybody submits. */
  getAvailability: materialProcedure
    .input(
      z.object({
        itemId: z.string(),
        startDate: z.date(),
        endDate: z.date(),
        excludeLoanId: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const item = await ctx.prisma.materialItem.findUnique({
        where: { id: input.itemId },
        include: {
          loans: {
            where: {
              status: { in: HOLDING_STATUSES },
              ...(input.excludeLoanId === undefined ? {} : { id: { not: input.excludeLoanId } }),
            },
            select: holdSelect,
          },
        },
      });
      if (!item) throw materialError('NOT_FOUND', 'itemNotFound', ctx.locale);
      const available = getAvailableForPeriod(
        item,
        item.loans,
        { start: input.startDate, end: input.endDate },
        new Date(),
      );
      return { available, maxLoanQuantity: item.maxLoanQuantity };
    }),

  /**
   * Every department, for the request form. The material team sees what each one has out;
   * everybody else only for the departments they belong to.
   */
  getDepartmentList: materialProcedure.query(async ({ ctx }) => {
    const team = isMaterialTeam(ctx.user);
    const departments = await ctx.prisma.materialDepartment.findMany({
      orderBy: { name: 'asc' },
      // participants only get the loans of their own departments, so only those are loaded
      include: {
        loans: {
          where: {
            status: { in: HOLDING_STATUSES },
            ...(team ? {} : { department: { hitobitoGroupId: { in: ctx.user.group_ids } } }),
          },
          include: loanInclude,
          orderBy: { endDate: 'asc' },
        },
      },
    });
    return departments.map(({ loans, hitobitoGroupId, contactName, ...department }) => {
      const isMine = hitobitoGroupId !== null && ctx.user.group_ids.includes(hitobitoGroupId);
      return {
        ...department,
        isMine,
        loans,
        // the contact and the Cevi.DB mapping are the material team's business
        // eslint-disable-next-line unicorn/no-null -- the same shape for everyone
        contactName: team || isMine ? contactName : null,
        // eslint-disable-next-line unicorn/no-null -- the same shape for everyone
        hitobitoGroupId: team ? hitobitoGroupId : null,
      };
    });
  }),

  /** People to lend to by name, for the material team's request form. */
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

  /** People who have material out or reserved, with what they have. */
  getPersonList: materialTeamProcedure.query(async ({ ctx }) => {
    const loans = await ctx.prisma.materialLoan.findMany({
      // eslint-disable-next-line unicorn/no-null -- Prisma matches a SQL NULL only through null
      where: { personId: { not: null }, status: { in: HOLDING_STATUSES } },
      include: loanInclude,
      orderBy: { endDate: 'asc' },
    });
    const people = new Map<string, { uuid: string; name: string; loans: typeof loans }>();
    for (const loan of loans) {
      if (!loan.person) continue;
      const entry = people.get(loan.person.uuid) ?? { ...loan.person, loans: [] };
      entry.loans.push(loan);
      people.set(loan.person.uuid, entry);
    }
    return [...people.values()].sort((a, b) => a.name.localeCompare(b.name));
  }),

  getLoanList: materialProcedure.input(loanListInput).query(async ({ ctx, input }) => {
    return await ctx.prisma.materialLoan.findMany({
      where: {
        AND: [
          visibleLoansWhere(ctx.user),
          input.itemId === undefined ? {} : { itemId: input.itemId },
          input.departmentId === undefined ? {} : { departmentId: input.departmentId },
          input.personId === undefined ? {} : { personId: input.personId },
          input.openOnly === true ? { status: { in: HOLDING_STATUSES } } : {},
        ],
      },
      include: loanInclude,
      // open loans by due date, so the cap never drops an old overdue loan for a new booking
      orderBy:
        input.openOnly === true
          ? [{ endDate: 'asc' }, { number: 'asc' }]
          : [{ startDate: 'desc' }, { number: 'desc' }],
      take: 500,
    });
  }),

  getLoan: materialProcedure
    .input(z.object({ number: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const loan = await ctx.prisma.materialLoan.findFirst({
        where: { AND: [{ number: input.number }, visibleLoansWhere(ctx.user)] },
        include: {
          ...loanInclude,
          incidents: { orderBy: { createdAt: 'desc' } },
        },
      });
      if (!loan) throw materialError('NOT_FOUND', 'loanNotFound', ctx.locale);
      return loan;
    }),

  /** The material team's desk: stock totals, the queue, and what needs attention. */
  getTeamDashboard: materialTeamProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const horizon = new Date(now.getTime() + LOOKAHEAD_MS);
    const entries = await loadItemsWithStock(ctx.prisma);
    const items = entries.map(({ item }) => item);

    const [openLoans, recentIncidents] = await Promise.all([
      ctx.prisma.materialLoan.findMany({
        where: { status: { in: HOLDING_STATUSES } },
        include: loanInclude,
        orderBy: { startDate: 'asc' },
      }),
      ctx.prisma.materialIncident.findMany({
        // eslint-disable-next-line unicorn/no-null -- Prisma matches a SQL NULL only through null
        where: { resolvedAt: null },
        include: {
          item: { select: { code: true, name: true } },
          loan: { select: { number: true } },
          reportedBy: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const incidents = await Promise.all(
      recentIncidents.map(async (incident) => ({
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

    const requested = openLoans.filter((loan) => loan.status === 'REQUESTED');
    const toIssue = openLoans.filter(
      (loan) => loan.status !== 'ISSUED' && loan.startDate <= horizon,
    );
    const issued = openLoans.filter((loan) => loan.status === 'ISSUED');
    const toReturn = issued.filter((loan) => loan.endDate >= now && loan.endDate <= horizon);
    const overdue = issued.filter((loan) => loan.endDate < now);
    const announced = issued.filter((loan) => loan.returnAnnouncedAt !== null);

    const warnings: MaterialWarning[] = overdue.map((loan) => ({
      kind: 'OVERDUE',
      loanId: loan.id,
      loanNumber: loan.number,
      itemName: loan.item.name,
      departmentName: loan.department.shortName,
    }));
    for (const { item, holds } of entries) {
      if (item.isDisabled) continue;
      const base = { itemCode: item.code, itemName: item.name };
      // a loss or damage after a reservation was promised can leave it without pieces
      const peak = getPeakHeldQuantity(holds, { start: now, end: new Date(8.64e15) }, now);
      if (peak > item.stock.usable) {
        warnings.push({ kind: 'OVERBOOKED', ...base, missing: peak - item.stock.usable });
      }
      if (item.stock.available === 0 && item.stock.usable > 0) {
        warnings.push({ kind: 'MAX_REACHED', ...base });
      } else if (item.stock.available <= item.lowStockThreshold) {
        warnings.push({ kind: 'LOW_STOCK', ...base, available: item.stock.available });
      }
      if (item.damagedQuantity > 0) {
        warnings.push({ kind: 'DAMAGED', ...base, quantity: item.damagedQuantity });
      }
      if (item.inRepairQuantity > 0) {
        warnings.push({ kind: 'IN_REPAIR', ...base, quantity: item.inRepairQuantity });
      }
    }

    const sum = (pick: (item: (typeof items)[number]) => number): number =>
      items.reduce((total, item) => total + pick(item), 0);

    return {
      stats: {
        articles: items.length,
        total: sum((item) => item.totalQuantity),
        available: sum((item) => item.stock.available),
        issued: sum((item) => item.stock.issued),
        reserved: sum((item) => item.stock.reserved),
        damaged: sum((item) => item.damagedQuantity),
        inRepair: sum((item) => item.inRepairQuantity),
      },
      requested,
      toIssue,
      toReturn,
      overdue,
      announced,
      incidents,
      warnings,
      items,
    };
  }),

  createLoan,
  updateLoan,
  cancelLoan,
  announceReturn,
  confirmLoan,
  issueLoan,
  returnLoan,
  reportIncident,
  createIncidentPhotoUploadUrl,
  createItem,
  updateItem,
  adjustItemStock,
  resolveIncident,
  createDepartment,
  updateDepartment,
  createCategory,
  updateCategory,
});
