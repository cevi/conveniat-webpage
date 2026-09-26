/* eslint-disable unicorn/no-null */
import { materialTeamProcedure } from '@/features/material/api/material-access';
import {
  applyBooking,
  assertBookable,
  hasHolder,
  holderSchema,
  lockLoan,
  MAX_LINES,
  MAX_QUANTITY,
  minDate,
  quantitySchema,
  type Booking,
  type LoanWithItem,
} from '@/features/material/api/material-booking';
import { hofExists } from '@/features/material/api/material-hoefe';
import {
  getInDepotQuantity,
  lockItem,
  lockItems,
  materialError,
  PENDING_STATUSES,
} from '@/features/material/api/material-shared';
import { mergeBasketLines } from '@/features/material/utils/basket';
import { holderKey, holderOf } from '@/features/material/utils/holders';
import { isReturnValid } from '@/features/material/utils/returns';
import type { MaterialCondition, Prisma } from '@/lib/prisma/client';
import { S3_BUCKET_NAME, s3ClientPublic } from '@/lib/s3';
import type { Locale, StaticTranslationString } from '@/types/types';
import { createLogger } from '@/utils/server-logger';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { TRPCError } from '@trpc/server';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';

const logger = createLogger('material:loans');

const conditionSchema = z.enum(['OK', 'LIGHT_DAMAGE', 'DAMAGED', 'MISSING']);
const photoKeySchema = z
  .string()
  .regex(/^material-incidents\/[\w-]+\.(jpg|jpeg|png|webp|heic|heif)$/)
  .optional();

/**
 * Books a basket at the counter in one go: every line becomes a loan, handed out now or
 * prepared for a pickup, and either all of them are booked or none. `preparedLoanIds` are the
 * holder's prepared loans the basket was opened from: the one of each article carries on with
 * the basket's quantity, the others and the articles the basket dropped are cancelled.
 */
export const createLoanBasket = materialTeamProcedure
  .input(
    z
      .object({
        ...holderSchema,
        responsibleName: z.string().trim().max(200).optional(),
        comment: z.string().trim().max(1000).optional(),
        mode: z.enum(['ISSUE', 'RESERVE']),
        /** the first day of a preparation; a hand-out starts now */
        startDate: z.date().optional(),
        endDate: z.date(),
        lines: z
          .array(
            z.object({
              itemId: z.string(),
              quantity: quantitySchema,
              isConsumption: z.boolean().default(false),
            }),
          )
          .max(MAX_LINES),
        preparedLoanIds: z.array(z.string()).max(MAX_LINES).default([]),
      })
      .refine(hasHolder, { message: 'A loan needs a Hof or a person.' })
      .refine((input) => input.mode === 'ISSUE' || input.startDate !== undefined, {
        message: 'A preparation needs a start date.',
      })
      .refine((input) => input.lines.length > 0 || input.preparedLoanIds.length > 0, {
        message: 'The basket is empty.',
      }),
  )
  .mutation(async ({ ctx, input }) => {
    // the Höfe come from Payload, read before the transaction rather than under its locks
    if (input.hofId !== undefined && !(await hofExists(input.hofId))) {
      throw materialError('NOT_FOUND', 'hofNotFound', ctx.locale);
    }
    const holder = holderOf({ hofId: input.hofId ?? null, personId: input.personId ?? null });
    if (holder === undefined) throw materialError('BAD_REQUEST', 'noHolder', ctx.locale);
    const lines = mergeBasketLines(input.lines);
    const now = new Date();

    return await ctx.prisma.$transaction(async (tx) => {
      const person =
        input.personId === undefined
          ? undefined
          : await tx.user.findUnique({ where: { uuid: input.personId }, select: { name: true } });
      if (person === null) throw materialError('BAD_REQUEST', 'personNotFound', ctx.locale);

      const planned = await tx.materialLoan.findMany({
        where: { id: { in: input.preparedLoanIds } },
        select: { itemId: true },
      });
      await lockItems(tx, [...lines.map((line) => line.itemId), ...planned.map((l) => l.itemId)]);

      // read under the locks: another phone may have handed them out meanwhile
      const prepared = await tx.materialLoan.findMany({
        where: { id: { in: input.preparedLoanIds } },
        orderBy: { number: 'asc' },
      });
      const foreign = prepared.some((loan) => {
        const owner = holderOf(loan);
        return (
          !PENDING_STATUSES.includes(loan.status) ||
          owner === undefined ||
          holderKey(owner) !== holderKey(holder)
        );
      });
      if (foreign || prepared.length !== new Set(input.preparedLoanIds).size) {
        throw materialError('CONFLICT', 'wrongStatus', ctx.locale);
      }

      // cancelled first, so the pieces they held count as free for the lines below
      const carriedOn = new Map<string, string>();
      const cancelled: string[] = [];
      for (const loan of prepared) {
        const kept = lines.some((line) => line.itemId === loan.itemId);
        if (kept && !carriedOn.has(loan.itemId)) carriedOn.set(loan.itemId, loan.id);
        else cancelled.push(loan.id);
      }
      if (cancelled.length > 0) {
        await tx.materialLoan.updateMany({
          where: { id: { in: cancelled } },
          data: { status: 'CANCELLED' },
        });
      }

      const numbers: number[] = [];
      for (const line of lines) {
        const item = await tx.materialItem.findUnique({ where: { id: line.itemId } });
        if (!item) throw materialError('NOT_FOUND', 'itemNotFound', ctx.locale);
        const loanId = carriedOn.get(item.id);
        const booking: Booking = {
          item,
          quantity: line.quantity,
          isConsumption: line.isConsumption,
          mode: input.mode,
          startDate: input.mode === 'ISSUE' ? now : (input.startDate ?? now),
          endDate: input.endDate,
          ...(loanId === undefined ? {} : { loanId }),
        };
        await assertBookable(tx, booking, ctx.locale);
        const data = await applyBooking(tx, booking, now);
        const loan =
          loanId === undefined
            ? await tx.materialLoan.create({
                data: {
                  ...data,
                  itemId: item.id,
                  hofId: input.hofId ?? null,
                  personId: input.personId ?? null,
                  responsibleName:
                    input.responsibleName === undefined || input.responsibleName === ''
                      ? (person?.name ?? '')
                      : input.responsibleName,
                  comment:
                    input.comment === undefined || input.comment === '' ? null : input.comment,
                  createdById: ctx.user.uuid,
                },
              })
            : await tx.materialLoan.update({ where: { id: loanId }, data });
        numbers.push(loan.number);
      }

      logger.info('Material basket booked', {
        'material.basket.mode': input.mode,
        'material.basket.lines': lines.length,
        'material.basket.cancelled': cancelled.length,
      });
      return { numbers, cancelled: cancelled.length };
    });
  });

/** A bulk selection is one pickup, or every pickup of the day. */
const bulkInput = z.object({ ids: z.array(z.string()).min(1).max(500) });

export interface BulkLoanResult {
  id: string;
  ok: boolean;
  error?: string;
}

const unexpectedError = {
  de: 'Unerwarteter Fehler.',
  en: 'Unexpected error.',
  fr: 'Erreur inattendue.',
} satisfies StaticTranslationString;

/**
 * Hands out prepared loans as they were prepared, each on its own: a loan whose pieces went
 * missing since fails alone, and the rest of the pickup still goes out. The answer says which
 * loan failed and why.
 */
export const issueLoanList = materialTeamProcedure
  .input(bulkInput)
  .mutation(async ({ ctx, input }) => {
    const results: BulkLoanResult[] = [];
    // one after the other: every step locks an article, and two loans may share one
    for (const id of new Set(input.ids)) {
      try {
        await ctx.prisma.$transaction(async (tx) => {
          const loan = await lockLoan(tx, id, ctx.locale);
          // a request the team hands out straight away is confirmed by that
          if (!PENDING_STATUSES.includes(loan.status)) {
            throw materialError('BAD_REQUEST', 'wrongStatus', ctx.locale);
          }
          const now = new Date();
          const booking: Booking = {
            item: loan.item,
            quantity: loan.quantity,
            isConsumption: loan.isConsumption,
            mode: 'ISSUE',
            // handed out early, so it holds from now rather than from the planned start
            startDate: minDate(loan.startDate, now),
            endDate: loan.endDate,
            loanId: loan.id,
          };
          await assertBookable(tx, booking, ctx.locale);
          await tx.materialLoan.update({
            where: { id: loan.id },
            data: await applyBooking(tx, booking, now),
          });
        });
        results.push({ id, ok: true });
      } catch (error) {
        if (error instanceof TRPCError) {
          results.push({ id, ok: false, error: error.message });
        } else {
          logger.error('Material hand-out failed', {
            'material.loan.id': id,
            'error.message': error instanceof Error ? error.message : String(error),
          });
          results.push({ id, ok: false, error: unexpectedError[ctx.locale] });
        }
      }
    }
    logger.info('Material loans issued in bulk', {
      'material.bulk.count': results.length,
      'material.bulk.failed': results.filter((result) => !result.ok).length,
    });
    return results;
  });

const returnLineSchema = z.object({
  loanId: z.string(),
  returnedQuantity: z.number().int().min(0).max(MAX_QUANTITY),
  condition: conditionSchema,
  damagedQuantity: z.number().int().min(0).max(MAX_QUANTITY).default(0),
  note: z.string().trim().max(2000).optional(),
  photoKey: photoKeySchema,
});

/**
 * Checks one loan back in. Pieces that did not come back leave the stock, damaged pieces move
 * out of the usable stock, and either one leaves an incident for the material team. Borrowed
 * consumables that do not come back were used up, which is expected and no incident.
 */
const checkIn = async (
  tx: Prisma.TransactionClient,
  loan: LoanWithItem,
  line: z.infer<typeof returnLineSchema>,
  reportedById: string,
  locale: Locale,
): Promise<void> => {
  if (loan.status !== 'ISSUED') throw materialError('CONFLICT', 'wrongStatus', locale);
  const issued = loan.issuedQuantity ?? loan.quantity;
  const damaged = line.condition === 'DAMAGED' ? line.damagedQuantity : 0;
  if (
    !isReturnValid({ issued, returned: line.returnedQuantity, condition: line.condition, damaged })
  ) {
    throw materialError('BAD_REQUEST', 'quantity', locale);
  }
  const missing = issued - line.returnedQuantity;
  const note = line.note ?? '';

  await tx.materialItem.update({
    where: { id: loan.itemId },
    data: { totalQuantity: { decrement: missing }, damagedQuantity: { increment: damaged } },
  });

  const incidents: { condition: MaterialCondition; quantity: number; note: string }[] = [];
  if (missing > 0 && !loan.item.isConsumable) {
    incidents.push({ condition: 'MISSING', quantity: missing, note });
  }
  if (line.condition === 'DAMAGED' || line.condition === 'LIGHT_DAMAGE') {
    incidents.push({
      condition: line.condition,
      quantity: line.condition === 'DAMAGED' ? damaged : line.returnedQuantity,
      note,
    });
  }
  if (incidents.length > 0) {
    await tx.materialIncident.createMany({
      data: incidents.map((incident, index) => ({
        ...incident,
        itemId: loan.itemId,
        loanId: loan.id,
        reportedById,
        // the photo belongs to the damage rather than to what is missing
        photoKey: index === incidents.length - 1 ? (line.photoKey ?? null) : null,
      })),
    });
  }

  await tx.materialLoan.update({
    where: { id: loan.id },
    data: {
      status: 'RETURNED',
      returnedQuantity: line.returnedQuantity,
      returnedAt: new Date(),
      returnCondition: missing > 0 && line.returnedQuantity === 0 ? 'MISSING' : line.condition,
      returnNote: line.note ?? null,
    },
  });
};

/**
 * Takes back what a holder brings in one go: every line checks one loan in, and either all of
 * them are recorded or none.
 */
export const returnLoanBasket = materialTeamProcedure
  .input(
    z
      .object({ lines: z.array(returnLineSchema).min(1).max(MAX_LINES) })
      .refine(
        (input) => new Set(input.lines.map((line) => line.loanId)).size === input.lines.length,
        {
          message: 'A loan can only be returned once.',
        },
      ),
  )
  .mutation(async ({ ctx, input }) => {
    const ids = input.lines.map((line) => line.loanId);
    return await ctx.prisma.$transaction(async (tx) => {
      const planned = await tx.materialLoan.findMany({
        where: { id: { in: ids } },
        select: { itemId: true },
      });
      await lockItems(
        tx,
        planned.map((loan) => loan.itemId),
      );
      // read under the locks: another phone may have checked them in meanwhile
      const locked = await tx.materialLoan.findMany({
        where: { id: { in: ids } },
        include: { item: true },
      });
      const loans = new Map(locked.map((loan) => [loan.id, loan]));
      let pieces = 0;
      for (const line of input.lines) {
        const loan = loans.get(line.loanId);
        if (loan === undefined) throw materialError('NOT_FOUND', 'loanNotFound', ctx.locale);
        await checkIn(tx, loan, line, ctx.user.uuid, ctx.locale);
        pieces += line.returnedQuantity;
      }
      logger.info('Material basket returned', {
        'material.basket.lines': input.lines.length,
        'material.basket.deviations': input.lines.filter((line) => line.condition !== 'OK').length,
      });
      return { count: input.lines.length, pieces };
    });
  });

/**
 * Damage or a loss noticed on the shelf. The pieces move right away: damaged ones out of the
 * usable stock, lost ones out of the total. A slight damage is only noted.
 */
export const reportIncident = materialTeamProcedure
  .input(
    z.object({
      itemId: z.string(),
      condition: conditionSchema.exclude(['OK']),
      quantity: quantitySchema,
      note: z.string().trim().min(1).max(2000),
      photoKey: photoKeySchema,
    }),
  )
  .mutation(async ({ ctx, input }) => {
    await ctx.prisma.$transaction(async (tx) => {
      await lockItem(tx, input.itemId);
      const item = await tx.materialItem.findUnique({ where: { id: input.itemId } });
      if (!item) throw materialError('NOT_FOUND', 'itemNotFound', ctx.locale);

      if (input.condition !== 'LIGHT_DAMAGE') {
        // only pieces on the shelf; what is out is settled when it comes back
        if (input.quantity > (await getInDepotQuantity(tx, item))) {
          throw materialError('BAD_REQUEST', 'quantity', ctx.locale);
        }
        await tx.materialItem.update({
          where: { id: item.id },
          data:
            input.condition === 'DAMAGED'
              ? { damagedQuantity: { increment: input.quantity } }
              : { totalQuantity: { decrement: input.quantity } },
        });
      }

      await tx.materialIncident.create({
        data: {
          itemId: item.id,
          condition: input.condition,
          quantity: input.quantity,
          note: input.note,
          photoKey: input.photoKey ?? null,
          reportedById: ctx.user.uuid,
        },
      });
      logger.info('Material incident reported', {
        'material.item.code': item.code,
        'material.condition': input.condition,
      });
    });
  });

/** A presigned upload for the photo of a damage, stored next to the other user uploads. */
export const createIncidentPhotoUploadUrl = materialTeamProcedure
  .input(z.object({ contentType: z.string().regex(/^image\/(jpeg|png|webp|heic|heif)$/) }))
  .mutation(async ({ input }) => {
    const extension = input.contentType.split('/')[1] ?? 'jpg';
    const key = `material-incidents/${randomUUID()}.${extension}`;
    const url = await getSignedUrl(
      s3ClientPublic,
      new PutObjectCommand({ Bucket: S3_BUCKET_NAME, Key: key, ContentType: input.contentType }),
      { expiresIn: 600 },
    );
    return { url, key };
  });

/**
 * Confirms requests as they were asked for, one pickup at a time: all of them turn prepared,
 * or none when one was changed or cancelled meanwhile. A request already holds its pieces, so
 * confirming it changes no stock.
 */
export const confirmLoanList = materialTeamProcedure
  .input(bulkInput)
  .mutation(async ({ ctx, input }) => {
    const ids = [...new Set(input.ids)];
    await ctx.prisma.$transaction(async (tx) => {
      const { count } = await tx.materialLoan.updateMany({
        where: { id: { in: ids }, status: 'REQUESTED' },
        data: { status: 'RESERVED' },
      });
      if (count !== ids.length) throw materialError('CONFLICT', 'wrongStatus', ctx.locale);
    });
    logger.info('Material requests confirmed', { 'material.bulk.count': ids.length });
  });

/**
 * Turns requests down, with a reason whoever asked sees next to them. The pieces they held are
 * free again at once.
 */
export const rejectLoanList = materialTeamProcedure
  .input(bulkInput.extend({ reason: z.string().trim().max(1000).optional() }))
  .mutation(async ({ ctx, input }) => {
    const ids = [...new Set(input.ids)];
    await ctx.prisma.$transaction(async (tx) => {
      const { count } = await tx.materialLoan.updateMany({
        where: { id: { in: ids }, status: 'REQUESTED' },
        data: {
          status: 'CANCELLED',
          // an empty reason still tells a rejection from a request its owner withdrew
          rejectionReason: input.reason ?? '',
        },
      });
      if (count !== ids.length) throw materialError('CONFLICT', 'wrongStatus', ctx.locale);
    });
    logger.info('Material requests rejected', { 'material.bulk.count': ids.length });
  });
