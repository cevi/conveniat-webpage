/* eslint-disable unicorn/no-null */
import {
  isMaterialTeam,
  materialProcedure,
  materialTeamProcedure,
} from '@/features/material/api/material-access';
import {
  assertAvailable,
  getInDepotQuantity,
  lockItem,
  materialError,
  visibleLoansWhere,
} from '@/features/material/api/material-shared';
import type { MaterialCondition, MaterialLoanStatus, Prisma } from '@/lib/prisma/client';
import { S3_BUCKET_NAME, s3ClientPublic } from '@/lib/s3';
import type { HitobitoNextAuthUser } from '@/types/hitobito-next-auth-user';
import type { Locale } from '@/types/types';
import { createLogger } from '@/utils/server-logger';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';

const logger = createLogger('material:loans');

const conditionSchema = z.enum(['OK', 'LIGHT_DAMAGE', 'DAMAGED', 'MISSING']);
const photoKeySchema = z
  .string()
  .regex(/^material-incidents\/[\w-]+\.(jpg|jpeg|png|webp|heic|heif)$/)
  .optional();

const PENDING = new Set<MaterialLoanStatus>(['REQUESTED', 'RESERVED']);

const minDate = (a: Date, b: Date): Date => new Date(Math.min(a.getTime(), b.getTime()));

/** Finds a loan the user may act on; the material team may act on every loan. */
const findOwnLoan = async (
  prisma: Prisma.TransactionClient,
  id: string,
  user: HitobitoNextAuthUser,
  locale: Locale,
): Promise<Prisma.MaterialLoanGetPayload<{ include: { item: true } }>> => {
  const loan = await prisma.materialLoan.findFirst({
    where: { AND: [{ id }, visibleLoansWhere(user)] },
    include: { item: true },
  });
  if (!loan) throw materialError('NOT_FOUND', 'loanNotFound', locale);
  return loan;
};

/**
 * Finds a loan and locks its article, then reads the loan again under the lock. Two taps on
 * "hand out" otherwise both pass the status check on the copy they read before waiting.
 */
const lockLoan = async (
  tx: Prisma.TransactionClient,
  id: string,
  user: HitobitoNextAuthUser,
  locale: Locale,
): Promise<Prisma.MaterialLoanGetPayload<{ include: { item: true } }>> => {
  const { itemId } = await findOwnLoan(tx, id, user, locale);
  await lockItem(tx, itemId);
  return await findOwnLoan(tx, id, user, locale);
};

const MAX_QUANTITY = 100_000;
const quantitySchema = z.number().int().min(1).max(MAX_QUANTITY);

const findPerson = async (
  prisma: Prisma.TransactionClient,
  personId: string | null | undefined,
  locale: Locale,
): Promise<void> => {
  if (personId === null || personId === undefined) return;
  const person = await prisma.user.findUnique({
    where: { uuid: personId },
    select: { uuid: true },
  });
  if (!person) throw materialError('BAD_REQUEST', 'personNotFound', locale);
};

/** Open requests one participant may have waiting, so nobody can hold the catalogue. */
const MAX_OPEN_REQUESTS = 20;

/**
 * A participant books for a department they belong to through Cevi.DB, and for themselves
 * as a person. Only the material team books on behalf of anyone else.
 */
const assertMayBookFor = async (
  prisma: Prisma.TransactionClient,
  user: HitobitoNextAuthUser,
  departmentId: string,
  personId: string | null,
  locale: Locale,
): Promise<void> => {
  const department = await prisma.materialDepartment.findUnique({
    where: { id: departmentId },
    select: { hitobitoGroupId: true },
  });
  if (!department) throw materialError('NOT_FOUND', 'departmentNotFound', locale);
  if (department.hitobitoGroupId === null || !user.group_ids.includes(department.hitobitoGroupId)) {
    throw materialError('FORBIDDEN', 'notOwnDepartment', locale);
  }
  if (personId !== null && personId !== user.uuid) {
    throw materialError('FORBIDDEN', 'notSelf', locale);
  }
};

const findDepartment = async (
  prisma: Prisma.TransactionClient,
  departmentId: string,
  locale: Locale,
): Promise<void> => {
  const department = await prisma.materialDepartment.findUnique({ where: { id: departmentId } });
  if (!department) throw materialError('NOT_FOUND', 'departmentNotFound', locale);
};

export const createLoan = materialProcedure
  .input(
    z.object({
      itemId: z.string(),
      quantity: quantitySchema,
      startDate: z.date(),
      endDate: z.date(),
      departmentId: z.string(),
      personId: z.string().nullable(),
      responsibleName: z.string().trim().min(1).max(200),
      comment: z.string().trim().max(1000).optional(),
      isConsumption: z.boolean().default(false),
      /** material team only: hand the material out right away, at the counter */
      issueNow: z.boolean().default(false),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const team = isMaterialTeam(ctx.user);

    return await ctx.prisma.$transaction(async (tx) => {
      await lockItem(tx, input.itemId);
      const item = await tx.materialItem.findUnique({ where: { id: input.itemId } });
      if (!item) throw materialError('NOT_FOUND', 'itemNotFound', ctx.locale);
      if (!team && !item.isReservable) {
        throw materialError('BAD_REQUEST', 'notReservable', ctx.locale);
      }
      if (input.isConsumption && !item.isConsumable) {
        throw materialError('BAD_REQUEST', 'notConsumable', ctx.locale);
      }
      await findDepartment(tx, input.departmentId, ctx.locale);
      await findPerson(tx, input.personId, ctx.locale);
      if (!team) {
        await assertMayBookFor(tx, ctx.user, input.departmentId, input.personId, ctx.locale);
        const open = await tx.materialLoan.count({
          where: { createdById: ctx.user.uuid, status: 'REQUESTED' },
        });
        if (open >= MAX_OPEN_REQUESTS) {
          throw materialError('BAD_REQUEST', 'tooManyRequests', ctx.locale, MAX_OPEN_REQUESTS);
        }
      }
      await assertAvailable({ tx, ...input, locale: ctx.locale });

      const issueNow = team && input.issueNow;
      if (issueNow && input.quantity > (await getInDepotQuantity(tx, item))) {
        throw materialError('BAD_REQUEST', 'quantity', ctx.locale);
      }
      let status: MaterialLoanStatus = team ? 'RESERVED' : 'REQUESTED';
      if (issueNow) status = input.isConsumption ? 'CONSUMED' : 'ISSUED';

      if (issueNow && input.isConsumption) {
        await tx.materialItem.update({
          where: { id: item.id },
          data: { totalQuantity: { decrement: input.quantity } },
        });
      }

      const loan = await tx.materialLoan.create({
        data: {
          itemId: item.id,
          quantity: input.quantity,
          departmentId: input.departmentId,
          personId: input.personId,
          responsibleName: input.responsibleName,
          comment: input.comment ?? null,
          // handed out now, so it holds from now even if the period starts later
          startDate: issueNow ? minDate(input.startDate, new Date()) : input.startDate,
          endDate: input.endDate,
          isConsumption: input.isConsumption,
          status,
          issuedQuantity: issueNow ? input.quantity : null,
          issuedAt: issueNow ? new Date() : null,
          createdById: ctx.user.uuid,
        },
      });
      logger.debug('Material loan created', {
        'material.loan.number': loan.number,
        'material.loan.status': status,
      });
      return { id: loan.id, number: loan.number, status };
    });
  });

export const updateLoan = materialProcedure
  .input(
    z.object({
      id: z.string(),
      quantity: quantitySchema.optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
      departmentId: z.string().optional(),
      personId: z.string().nullable().optional(),
      responsibleName: z.string().trim().min(1).max(200).optional(),
      comment: z.string().trim().max(1000).nullable().optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const team = isMaterialTeam(ctx.user);

    return await ctx.prisma.$transaction(async (tx) => {
      const current = await lockLoan(tx, input.id, ctx.user, ctx.locale);

      // once the material is out, only the material team may move the return date
      const onlyExtendsIssued =
        current.status === 'ISSUED' &&
        team &&
        input.quantity === undefined &&
        input.startDate === undefined;
      if (!PENDING.has(current.status) && !onlyExtendsIssued) {
        throw materialError('BAD_REQUEST', 'wrongStatus', ctx.locale);
      }
      if (input.departmentId !== undefined) {
        await findDepartment(tx, input.departmentId, ctx.locale);
      }
      await findPerson(tx, input.personId, ctx.locale);
      const changesAssignee =
        (input.departmentId !== undefined && input.departmentId !== current.departmentId) ||
        (input.personId !== undefined && input.personId !== current.personId);
      if (!team && changesAssignee) {
        await assertMayBookFor(
          tx,
          ctx.user,
          input.departmentId ?? current.departmentId,
          input.personId === undefined ? current.personId : input.personId,
          ctx.locale,
        );
      }

      const quantity = input.quantity ?? current.quantity;
      const startDate = input.startDate ?? current.startDate;
      const endDate = input.endDate ?? current.endDate;
      const changesStock =
        quantity !== current.quantity ||
        startDate.getTime() !== current.startDate.getTime() ||
        endDate.getTime() !== current.endDate.getTime();

      if (changesStock) {
        await assertAvailable({
          tx,
          itemId: current.itemId,
          quantity: current.status === 'ISSUED' ? (current.issuedQuantity ?? quantity) : quantity,
          startDate,
          endDate,
          excludeLoanId: current.id,
          locale: ctx.locale,
        });
      }

      // a participant changing a confirmed reservation needs the material team to confirm again
      const status: MaterialLoanStatus =
        !team && (changesStock || changesAssignee) && current.status === 'RESERVED'
          ? 'REQUESTED'
          : current.status;

      await tx.materialLoan.update({
        where: { id: current.id },
        data: {
          quantity,
          startDate,
          endDate,
          status,
          ...(input.departmentId === undefined ? {} : { departmentId: input.departmentId }),
          ...(input.personId === undefined ? {} : { personId: input.personId }),
          ...(input.responsibleName === undefined
            ? {}
            : { responsibleName: input.responsibleName }),
          ...(input.comment === undefined ? {} : { comment: input.comment }),
        },
      });
      return { status };
    });
  });

export const cancelLoan = materialProcedure
  .input(z.object({ id: z.string() }))
  .mutation(async ({ ctx, input }) => {
    await ctx.prisma.$transaction(async (tx) => {
      const loan = await lockLoan(tx, input.id, ctx.user, ctx.locale);
      if (!PENDING.has(loan.status)) {
        throw materialError('BAD_REQUEST', 'wrongStatus', ctx.locale);
      }
      await tx.materialLoan.update({ where: { id: loan.id }, data: { status: 'CANCELLED' } });
      logger.debug('Material loan cancelled', { 'material.loan.number': loan.number });
    });
  });

/** The borrower says the material is on its way back; the material team still checks it. */
export const announceReturn = materialProcedure
  .input(z.object({ id: z.string() }))
  .mutation(async ({ ctx, input }) => {
    const loan = await findOwnLoan(ctx.prisma, input.id, ctx.user, ctx.locale);
    const { count } = await ctx.prisma.materialLoan.updateMany({
      where: { id: loan.id, status: 'ISSUED' },
      data: { returnAnnouncedAt: new Date() },
    });
    if (count === 0) throw materialError('BAD_REQUEST', 'wrongStatus', ctx.locale);
  });

export const confirmLoan = materialTeamProcedure
  .input(z.object({ id: z.string() }))
  .mutation(async ({ ctx, input }) => {
    const { count } = await ctx.prisma.materialLoan.updateMany({
      where: { id: input.id, status: 'REQUESTED' },
      data: { status: 'RESERVED' },
    });
    if (count === 0) throw materialError('BAD_REQUEST', 'wrongStatus', ctx.locale);
  });

export const issueLoan = materialTeamProcedure
  .input(z.object({ id: z.string(), issuedQuantity: quantitySchema }))
  .mutation(async ({ ctx, input }) => {
    await ctx.prisma.$transaction(async (tx) => {
      const loan = await lockLoan(tx, input.id, ctx.user, ctx.locale);
      if (!PENDING.has(loan.status)) {
        throw materialError('BAD_REQUEST', 'wrongStatus', ctx.locale);
      }
      // the reservation already holds `quantity`, handing out less is always possible
      if (input.issuedQuantity > loan.quantity) {
        throw materialError('BAD_REQUEST', 'quantity', ctx.locale);
      }

      // what the reservation promised may have been damaged or lost since
      const onShelf = await getInDepotQuantity(tx, loan.item);
      if (input.issuedQuantity > onShelf) {
        throw materialError('CONFLICT', 'notOnShelf', ctx.locale, Math.max(onShelf, 0));
      }

      if (loan.isConsumption) {
        await tx.materialItem.update({
          where: { id: loan.itemId },
          data: { totalQuantity: { decrement: input.issuedQuantity } },
        });
      }

      await tx.materialLoan.update({
        where: { id: loan.id },
        data: {
          status: loan.isConsumption ? 'CONSUMED' : 'ISSUED',
          issuedQuantity: input.issuedQuantity,
          issuedAt: new Date(),
          // handed out early, so it holds from now rather than from the planned start
          startDate: minDate(loan.startDate, new Date()),
        },
      });
      logger.info('Material issued', {
        'material.loan.number': loan.number,
        'material.quantity': input.issuedQuantity,
      });
    });
  });

/**
 * Checks material back in. Pieces that did not come back leave the stock, damaged pieces move
 * out of the usable stock, and either one leaves an incident for the material team. Borrowed
 * consumables that do not come back were used up, which is expected and no incident.
 */
export const returnLoan = materialTeamProcedure
  .input(
    z
      .object({
        id: z.string(),
        returnedQuantity: z.number().int().min(0).max(MAX_QUANTITY),
        condition: conditionSchema,
        damagedQuantity: z.number().int().min(0).max(MAX_QUANTITY).default(0),
        note: z.string().trim().max(2000).optional(),
        photoKey: photoKeySchema,
      })
      // a damage needs pieces that came back, and at least one of them damaged
      .refine(
        (input) =>
          (input.condition !== 'DAMAGED' && input.condition !== 'LIGHT_DAMAGE') ||
          input.returnedQuantity > 0,
      )
      .refine(
        (input) =>
          input.condition !== 'DAMAGED' ||
          (input.damagedQuantity > 0 && input.damagedQuantity <= input.returnedQuantity),
      ),
  )
  .mutation(async ({ ctx, input }) => {
    await ctx.prisma.$transaction(async (tx) => {
      const loan = await lockLoan(tx, input.id, ctx.user, ctx.locale);
      if (loan.status !== 'ISSUED') throw materialError('BAD_REQUEST', 'wrongStatus', ctx.locale);

      const issued = loan.issuedQuantity ?? loan.quantity;
      const damaged = input.condition === 'DAMAGED' ? input.damagedQuantity : 0;
      if (input.returnedQuantity > issued) {
        throw materialError('BAD_REQUEST', 'quantity', ctx.locale);
      }
      const missing = issued - input.returnedQuantity;
      const note = input.note ?? '';

      await tx.materialItem.update({
        where: { id: loan.itemId },
        data: {
          totalQuantity: { decrement: missing },
          damagedQuantity: { increment: damaged },
        },
      });

      const incidents: { condition: MaterialCondition; quantity: number; note: string }[] = [];
      if (missing > 0 && !loan.item.isConsumable) {
        incidents.push({ condition: 'MISSING', quantity: missing, note });
      }
      if (input.condition === 'DAMAGED' || input.condition === 'LIGHT_DAMAGE') {
        incidents.push({
          condition: input.condition,
          quantity: input.condition === 'DAMAGED' ? damaged : input.returnedQuantity,
          note,
        });
      }
      if (incidents.length > 0) {
        await tx.materialIncident.createMany({
          data: incidents.map((incident, index) => ({
            ...incident,
            itemId: loan.itemId,
            loanId: loan.id,
            reportedById: ctx.user.uuid,
            // the photo belongs to the damage rather than to what is missing
            photoKey: index === incidents.length - 1 ? (input.photoKey ?? null) : null,
          })),
        });
      }

      await tx.materialLoan.update({
        where: { id: loan.id },
        data: {
          status: 'RETURNED',
          returnedQuantity: input.returnedQuantity,
          returnedAt: new Date(),
          returnCondition:
            missing > 0 && input.returnedQuantity === 0 ? 'MISSING' : input.condition,
          returnNote: input.note ?? null,
        },
      });
      logger.info('Material returned', {
        'material.loan.number': loan.number,
        'material.missing': missing,
        'material.damaged': damaged,
      });
    });
  });

/**
 * Reports damage or a loss. On a loan that is still out, the stock is settled when it comes
 * back; the material team reporting straight on an article moves the pieces right away.
 */
export const reportIncident = materialProcedure
  .input(
    z.object({
      itemId: z.string(),
      loanId: z.string().optional(),
      condition: conditionSchema.exclude(['OK']),
      quantity: quantitySchema,
      note: z.string().trim().min(1).max(2000),
      photoKey: photoKeySchema,
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const team = isMaterialTeam(ctx.user);

    await ctx.prisma.$transaction(async (tx) => {
      if (input.loanId !== undefined) {
        const loan = await findOwnLoan(tx, input.loanId, ctx.user, ctx.locale);
        if (loan.itemId !== input.itemId) {
          throw materialError('BAD_REQUEST', 'itemNotFound', ctx.locale);
        }
      }
      await lockItem(tx, input.itemId);
      const item = await tx.materialItem.findUnique({ where: { id: input.itemId } });
      if (!item) throw materialError('NOT_FOUND', 'itemNotFound', ctx.locale);

      if (team && input.loanId === undefined && input.condition !== 'LIGHT_DAMAGE') {
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
          loanId: input.loanId ?? null,
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
export const createIncidentPhotoUploadUrl = materialProcedure
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
