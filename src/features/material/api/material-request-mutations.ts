import { materialProcedure } from '@/features/material/api/material-access';
import {
  applyBooking,
  assertBookable,
  hasHolder,
  holderSchema,
  lockLoan,
  MAX_LINES,
  quantitySchema,
  type Booking,
} from '@/features/material/api/material-booking';
import {
  lockItems,
  materialError,
  PENDING_STATUSES,
  visibleLoansWhere,
} from '@/features/material/api/material-shared';
import { isOnOrderStep, mergeBasketLines } from '@/features/material/utils/basket';
import type { HitobitoNextAuthUser } from '@/types/hitobito-next-auth-user';
import type { Locale } from '@/types/types';
import { createLogger } from '@/utils/server-logger';
import { z } from 'zod';

const logger = createLogger('material:requests');

/** Open requests one participant may have waiting, so nobody can hold the catalogue. */
export const MAX_OPEN_REQUESTS = 20;

/**
 * A participant asks for a Hof they lead or are registered for, or for themselves. Only the
 * material team books on behalf of anyone else.
 */
const assertMayRequestFor = (
  user: HitobitoNextAuthUser,
  input: { hofId?: string | undefined; personId?: string | undefined },
  myHofIds: string[],
  locale: Locale,
): void => {
  if (input.hofId !== undefined && !myHofIds.includes(input.hofId)) {
    throw materialError('FORBIDDEN', 'notOwnHof', locale);
  }
  if (input.personId !== undefined && input.personId !== user.uuid) {
    throw materialError('FORBIDDEN', 'notSelf', locale);
  }
};

/**
 * A participant's basket, asked for in one go: every line becomes a request that holds its
 * pieces until the material team confirms or turns it down. All of them or none.
 */
export const createLoanRequest = materialProcedure
  .input(
    z
      .object({
        ...holderSchema,
        responsibleName: z.string().trim().min(1).max(200),
        comment: z.string().trim().max(1000).optional(),
        startDate: z.date(),
        endDate: z.date(),
        lines: z
          .array(z.object({ itemId: z.string(), quantity: quantitySchema }))
          .min(1)
          .max(MAX_LINES),
      })
      .refine(hasHolder, { message: 'A loan needs a Hof or a person.' }),
  )
  .mutation(async ({ ctx, input }) => {
    assertMayRequestFor(ctx.user, input, await ctx.myHofIds(), ctx.locale);
    const lines = mergeBasketLines(input.lines.map((line) => ({ ...line, isConsumption: false })));

    return await ctx.prisma.$transaction(async (tx) => {
      // two baskets sent at once would both count the same open requests and pass the cap
      await tx.$queryRaw`SELECT 1 FROM "User" WHERE uuid = ${ctx.user.uuid} FOR UPDATE`;
      const open = await tx.materialLoan.count({
        where: { createdById: ctx.user.uuid, status: 'REQUESTED' },
      });
      if (open + lines.length > MAX_OPEN_REQUESTS) {
        throw materialError('BAD_REQUEST', 'tooManyRequests', ctx.locale, MAX_OPEN_REQUESTS);
      }
      await lockItems(
        tx,
        lines.map((line) => line.itemId),
      );

      const numbers: number[] = [];
      for (const line of lines) {
        const item = await tx.materialItem.findUnique({ where: { id: line.itemId } });
        if (!item) throw materialError('NOT_FOUND', 'itemNotFound', ctx.locale);
        if (!isOnOrderStep(line.quantity, item.orderStep)) {
          throw materialError('BAD_REQUEST', 'offStep', ctx.locale, item.orderStep, item.name);
        }
        const booking: Booking = {
          item,
          quantity: line.quantity,
          // a consumable is asked for to be used up; the team can still lend it in Anpassen
          isConsumption: item.isConsumable,
          mode: 'RESERVE',
          startDate: input.startDate,
          endDate: input.endDate,
        };
        await assertBookable(tx, booking, ctx.locale);
        const loan = await tx.materialLoan.create({
          data: {
            ...(await applyBooking(tx, booking, new Date())),
            status: 'REQUESTED',
            itemId: item.id,
            // eslint-disable-next-line unicorn/no-null -- a person asking for themselves has no Hof
            hofId: input.hofId ?? null,
            // eslint-disable-next-line unicorn/no-null -- a Hof's request is the Hof's
            personId: input.personId ?? null,
            responsibleName: input.responsibleName,
            // eslint-disable-next-line unicorn/no-null -- no comment
            comment: input.comment === undefined || input.comment === '' ? null : input.comment,
            createdById: ctx.user.uuid,
          },
        });
        numbers.push(loan.number);
      }
      logger.info('Material requested', { 'material.basket.lines': lines.length });
      return { numbers };
    });
  });

/** Changes a request while the material team has not answered it yet. */
export const updateLoanRequest = materialProcedure
  .input(
    z.object({
      id: z.string(),
      quantity: quantitySchema.optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
      responsibleName: z.string().trim().min(1).max(200).optional(),
      comment: z.string().trim().max(1000).nullable().optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const visible = await visibleLoansWhere(ctx.user, ctx.myHofIds);
    await ctx.prisma.$transaction(async (tx) => {
      const loan = await lockLoan(tx, input.id, ctx.locale, visible);
      if (loan.status !== 'REQUESTED') throw materialError('CONFLICT', 'wrongStatus', ctx.locale);
      // only a changed quantity: a request from before the step keeps its dates editable
      if (input.quantity !== undefined && !isOnOrderStep(input.quantity, loan.item.orderStep)) {
        throw materialError(
          'BAD_REQUEST',
          'offStep',
          ctx.locale,
          loan.item.orderStep,
          loan.item.name,
        );
      }
      const booking: Booking = {
        item: loan.item,
        quantity: input.quantity ?? loan.quantity,
        isConsumption: loan.isConsumption,
        mode: 'RESERVE',
        startDate: input.startDate ?? loan.startDate,
        endDate: input.endDate ?? loan.endDate,
        loanId: loan.id,
      };
      await assertBookable(tx, booking, ctx.locale);
      await tx.materialLoan.update({
        where: { id: loan.id },
        data: {
          quantity: booking.quantity,
          startDate: booking.startDate,
          endDate: booking.endDate,
          ...(input.responsibleName === undefined
            ? {}
            : { responsibleName: input.responsibleName }),
          ...(input.comment === undefined
            ? {}
            : // eslint-disable-next-line unicorn/no-null -- an emptied comment is none
              { comment: input.comment === '' ? null : input.comment }),
        },
      });
    });
  });

/** Withdraws a request or a confirmed pickup, up to the moment it is handed out. */
export const cancelLoanRequest = materialProcedure
  .input(z.object({ id: z.string() }))
  .mutation(async ({ ctx, input }) => {
    const visible = await visibleLoansWhere(ctx.user, ctx.myHofIds);
    await ctx.prisma.$transaction(async (tx) => {
      const loan = await lockLoan(tx, input.id, ctx.locale, visible);
      if (!PENDING_STATUSES.includes(loan.status)) {
        throw materialError('CONFLICT', 'wrongStatus', ctx.locale);
      }
      await tx.materialLoan.update({ where: { id: loan.id }, data: { status: 'CANCELLED' } });
      logger.debug('Material request cancelled', { 'material.loan.number': loan.number });
    });
  });

/**
 * The borrower says material is on its way back, one loan or everything a holder has out. The
 * material team still counts it at the take-back; until then nothing changes in the stock.
 */
export const announceReturn = materialProcedure
  .input(z.object({ ids: z.array(z.string()).min(1).max(MAX_LINES) }))
  .mutation(async ({ ctx, input }) => {
    const visible = await visibleLoansWhere(ctx.user, ctx.myHofIds);
    const { count } = await ctx.prisma.materialLoan.updateMany({
      where: {
        AND: [
          { id: { in: input.ids }, status: 'ISSUED' },
          // eslint-disable-next-line unicorn/no-null -- announced once is enough
          { returnAnnouncedAt: null },
          visible,
        ],
      },
      data: { returnAnnouncedAt: new Date() },
    });
    if (count === 0) throw materialError('BAD_REQUEST', 'wrongStatus', ctx.locale);
    return { count };
  });
