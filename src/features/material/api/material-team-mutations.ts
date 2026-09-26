import { materialTeamProcedure } from '@/features/material/api/material-access';
import {
  getIssuedQuantity,
  lockItem,
  materialError,
} from '@/features/material/api/material-shared';
import { Prisma } from '@/lib/prisma/client';
import { createLogger } from '@/utils/server-logger';
import { z } from 'zod';

const logger = createLogger('material:team');

const itemFields = z.object({
  name: z.string().trim().min(1).max(200),
  code: z
    .string()
    .trim()
    .regex(/^[A-Z0-9-]{2,24}$/),
  categoryId: z.string(),
  description: z.string().trim().max(5000),
  usageNotes: z.string().trim().max(2000).nullable(),
  returnInstructions: z.string().trim().max(2000),
  imageUrl: z.string().url().nullable(),
  unit: z.string().trim().min(1).max(40),
  totalQuantity: z.number().int().min(0).max(1_000_000),
  maxLoanQuantity: z.number().int().min(1).max(1_000_000),
  lowStockThreshold: z.number().int().min(0).max(1_000_000),
  isConsumable: z.boolean(),
  isReservable: z.boolean(),
  isDisabled: z.boolean(),
});

const isUniqueViolation = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';

export const createItem = materialTeamProcedure
  .input(itemFields)
  .mutation(async ({ ctx, input }) => {
    try {
      const item = await ctx.prisma.materialItem.create({ data: input });
      logger.info('Material item created', { 'material.item.code': item.code });
      return { code: item.code };
    } catch (error) {
      if (isUniqueViolation(error)) throw materialError('CONFLICT', 'duplicate', ctx.locale);
      throw error;
    }
  });

export const updateItem = materialTeamProcedure
  .input(itemFields.extend({ id: z.string() }))
  .mutation(async ({ ctx, input }) => {
    const { id, ...data } = input;
    await ctx.prisma.$transaction(async (tx) => {
      await lockItem(tx, id);
      const item = await tx.materialItem.findUnique({ where: { id } });
      if (!item) throw materialError('NOT_FOUND', 'itemNotFound', ctx.locale);
      // the pieces that are out still exist and come back
      const issued = await getIssuedQuantity(tx, id);
      if (data.totalQuantity < item.damagedQuantity + item.inRepairQuantity + issued) {
        throw materialError('BAD_REQUEST', 'quantity', ctx.locale);
      }
      try {
        await tx.materialItem.update({ where: { id }, data });
      } catch (error) {
        if (isUniqueViolation(error)) throw materialError('CONFLICT', 'duplicate', ctx.locale);
        throw error;
      }
    });
  });

/**
 * Moves pieces between the usable stock, the damaged pile and the workshop:
 * a damaged piece goes to repair, comes back usable, or is written off for good.
 */
export const adjustItemStock = materialTeamProcedure
  .input(
    z.object({
      id: z.string(),
      action: z.enum([
        'START_REPAIR',
        'FINISH_REPAIR',
        'WRITE_OFF_DAMAGED',
        'MARK_REPAIRED_DAMAGED',
      ]),
      quantity: z.number().int().min(1).max(1_000_000),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    await ctx.prisma.$transaction(async (tx) => {
      await lockItem(tx, input.id);
      const item = await tx.materialItem.findUnique({ where: { id: input.id } });
      if (!item) throw materialError('NOT_FOUND', 'itemNotFound', ctx.locale);

      const fromDamaged = input.action === 'START_REPAIR' || input.action === 'WRITE_OFF_DAMAGED';
      const source = fromDamaged ? item.damagedQuantity : item.inRepairQuantity;
      if (input.quantity > source) throw materialError('BAD_REQUEST', 'quantity', ctx.locale);

      const q = input.quantity;
      const data: Prisma.MaterialItemUpdateInput = {
        START_REPAIR: { damagedQuantity: { decrement: q }, inRepairQuantity: { increment: q } },
        FINISH_REPAIR: { inRepairQuantity: { decrement: q } },
        WRITE_OFF_DAMAGED: { damagedQuantity: { decrement: q }, totalQuantity: { decrement: q } },
        // beyond repair after all
        MARK_REPAIRED_DAMAGED: {
          inRepairQuantity: { decrement: q },
          damagedQuantity: { increment: q },
        },
      }[input.action];

      await tx.materialItem.update({ where: { id: item.id }, data });
      logger.info('Material stock adjusted', {
        'material.item.code': item.code,
        'material.action': input.action,
        'material.quantity': q,
      });
    });
  });

export const resolveIncident = materialTeamProcedure
  .input(z.object({ id: z.string() }))
  .mutation(async ({ ctx, input }) => {
    await ctx.prisma.materialIncident.update({
      where: { id: input.id },
      data: { resolvedAt: new Date() },
    });
  });

const departmentFields = z.object({
  name: z.string().trim().min(2).max(200),
  shortName: z.string().trim().min(1).max(20),
  contactName: z.string().trim().max(200).nullable(),
  hitobitoGroupId: z.number().int().positive().nullable(),
});

export const createDepartment = materialTeamProcedure
  .input(departmentFields)
  .mutation(async ({ ctx, input }) => {
    try {
      const department = await ctx.prisma.materialDepartment.create({ data: input });
      return { id: department.id };
    } catch (error) {
      if (isUniqueViolation(error)) throw materialError('CONFLICT', 'duplicate', ctx.locale);
      throw error;
    }
  });

/** A department's name, contact or Cevi.DB group changes during camp, too. */
export const updateDepartment = materialTeamProcedure
  .input(departmentFields.extend({ id: z.string() }))
  .mutation(async ({ ctx, input }) => {
    const { id, ...data } = input;
    try {
      await ctx.prisma.materialDepartment.update({ where: { id }, data });
    } catch (error) {
      if (isUniqueViolation(error)) throw materialError('CONFLICT', 'duplicate', ctx.locale);
      throw error;
    }
  });

const categoryFields = z.object({
  name: z.string().trim().min(1).max(100),
  sortOrder: z.number().int().min(0).max(10_000),
});

/** A shelf for material nobody planned for, created where the material arrives. */
export const createCategory = materialTeamProcedure
  .input(categoryFields)
  .mutation(async ({ ctx, input }) => {
    try {
      const category = await ctx.prisma.materialCategory.create({ data: input });
      return { id: category.id };
    } catch (error) {
      if (isUniqueViolation(error)) throw materialError('CONFLICT', 'duplicate', ctx.locale);
      throw error;
    }
  });

export const updateCategory = materialTeamProcedure
  .input(categoryFields.extend({ id: z.string() }))
  .mutation(async ({ ctx, input }) => {
    const { id, ...data } = input;
    try {
      await ctx.prisma.materialCategory.update({ where: { id }, data });
    } catch (error) {
      if (isUniqueViolation(error)) throw materialError('CONFLICT', 'duplicate', ctx.locale);
      throw error;
    }
  });
