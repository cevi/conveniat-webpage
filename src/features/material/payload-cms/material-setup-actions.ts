'use server';

import {
  type SetupMessageKey,
  setupMessages,
  type SetupResult,
} from '@/features/material/payload-cms/material-setup-messages';
import { isFullAdmin } from '@/features/payload-cms/payload-cms/access-rules/roles';
import prisma from '@/lib/db/prisma';
import { Prisma } from '@/lib/prisma/client';
import { createLogger } from '@/utils/server-logger';
import config from '@payload-config';
import { headers } from 'next/headers';
import { createLocalReq, getPayload } from 'payload';
import { z } from 'zod';

/*
 * Server actions of the depot setup page in the admin panel. Payload admin components cannot
 * reach tRPC, which is why these exist; the app never calls them. Everything here is the
 * one-off setup: categories, departments and the first catalogue. Day-to-day stock changes
 * happen in the app, where they are checked against open loans.
 */

const logger = createLogger('material:setup');

const MAX_IMPORT_ROWS = 2000;

const failed = (
  message: SetupMessageKey,
  values?: Record<string, string | number>,
): SetupResult => ({ ok: false, message, ...(values === undefined ? {} : { values }) });

/** One import problem as a line of the summary, in German like the pasted spreadsheet. */
const describe = (key: SetupMessageKey, values: Record<string, string | number>): string =>
  Object.entries(values).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
    setupMessages[key].de,
  );

/**
 * Resolves the admin user from the request cookies; the setup is for full admins only. A server
 * action is a public endpoint, so every action starts here.
 */
const canSetUp = async (): Promise<boolean> => {
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: await headers() });
  if (!user) return false;
  const request = await createLocalReq({ user }, payload);
  return await isFullAdmin({ req: request });
};

const isKnownError = (error: unknown, code: string): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;

const categorySchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1).max(100),
  sortOrder: z.number().int().min(0).max(10_000),
});

export const saveMaterialCategory = async (
  input: z.input<typeof categorySchema>,
): Promise<SetupResult> => {
  if (!(await canSetUp())) return failed('forbidden');
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) return failed('invalidCategory');
  const { id, ...data } = parsed.data;
  try {
    await (id === undefined
      ? prisma.materialCategory.create({ data })
      : prisma.materialCategory.update({ where: { id }, data }));
    return { ok: true, message: 'categorySaved', values: { name: data.name } };
  } catch (error) {
    if (isKnownError(error, 'P2002')) return failed('categoryExists', { name: data.name });
    throw error;
  }
};

export const deleteMaterialCategory = async (id: string): Promise<SetupResult> => {
  if (!(await canSetUp())) return failed('forbidden');
  const items = await prisma.materialItem.count({ where: { categoryId: id } });
  if (items > 0) return failed('categoryNotEmpty', { n: items });
  await prisma.materialCategory.delete({ where: { id } });
  return { ok: true, message: 'categoryDeleted' };
};

const departmentSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2).max(200),
  shortName: z.string().trim().min(1).max(20),
  contactName: z.string().trim().max(200).nullable(),
  hitobitoGroupId: z.number().int().positive().nullable(),
});

export const saveMaterialDepartment = async (
  input: z.input<typeof departmentSchema>,
): Promise<SetupResult> => {
  if (!(await canSetUp())) return failed('forbidden');
  const parsed = departmentSchema.safeParse(input);
  if (!parsed.success) return failed('invalidDepartment');
  const { id, ...data } = parsed.data;
  try {
    await (id === undefined
      ? prisma.materialDepartment.create({ data })
      : prisma.materialDepartment.update({ where: { id }, data }));
    return { ok: true, message: 'departmentSaved', values: { name: data.shortName } };
  } catch (error) {
    if (isKnownError(error, 'P2002')) return failed('departmentExists');
    throw error;
  }
};

export const deleteMaterialDepartment = async (id: string): Promise<SetupResult> => {
  if (!(await canSetUp())) return failed('forbidden');
  const loans = await prisma.materialLoan.count({ where: { departmentId: id } });
  if (loans > 0) return failed('departmentHasLoans', { n: loans });
  await prisma.materialDepartment.delete({ where: { id } });
  return { ok: true, message: 'departmentDeleted' };
};

const IMPORT_COLUMNS = [
  'code',
  'name',
  'category',
  'total',
  'max',
  'unit',
  'consumable',
  'reservable',
  'description',
  'returnInstructions',
  'imageUrl',
] as const;

const truthy = (value: string): boolean => ['1', 'ja', 'oui', 'yes', 'true', 'x'].includes(value);

const importRowSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9-]{2,24}$/),
  name: z.string().trim().min(1).max(200),
  category: z.string().trim().min(1).max(100),
  total: z.coerce.number().int().min(0).max(1_000_000),
  max: z.coerce.number().int().min(1).max(1_000_000),
  unit: z.string().trim().max(40),
  consumable: z.string().trim().toLowerCase(),
  reservable: z.string().trim().toLowerCase(),
  description: z.string().trim().max(5000),
  returnInstructions: z.string().trim().max(2000),
  imageUrl: z.union([z.literal(''), z.string().trim().url()]),
});

/** Splits one line at tabs or `;`, the separators a copy out of a spreadsheet produces. */
const splitLine = (line: string): string[] =>
  line.split(line.includes('\t') ? '\t' : ';').map((cell) => cell.trim());

/**
 * Creates the catalogue from rows pasted out of a spreadsheet, or updates articles whose code
 * already exists. A row that does not parse is reported and skipped, the others still go in.
 * An existing article keeps its damaged and repair counts, and its total cannot drop below
 * what is out or broken.
 */
export const importMaterialCatalogue = async (text: string): Promise<SetupResult> => {
  if (!(await canSetUp())) return failed('forbidden');

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== '');
  // a pasted header row is optional
  if (lines[0]?.toLowerCase().startsWith('code') === true) lines.shift();
  if (lines.length === 0) return failed('importEmpty');
  if (lines.length > MAX_IMPORT_ROWS) return failed('importTooLarge', { n: MAX_IMPORT_ROWS });

  let created = 0;
  let updated = 0;
  const problems: string[] = [];

  for (const [index, line] of lines.entries()) {
    const cells = splitLine(line);
    const raw = Object.fromEntries(
      IMPORT_COLUMNS.map((column, position) => [column, cells[position] ?? '']),
    );
    const parsed = importRowSchema.safeParse(raw);
    if (!parsed.success) {
      const fields = [...new Set(parsed.error.issues.map((issue) => issue.path.join('.')))];
      problems.push(describe('importRowInvalid', { row: index + 1, fields: fields.join(', ') }));
      continue;
    }
    const row = parsed.data;
    const category = await prisma.materialCategory.upsert({
      where: { name: row.category },
      update: {},
      create: { name: row.category },
    });
    const data = {
      name: row.name,
      categoryId: category.id,
      totalQuantity: row.total,
      maxLoanQuantity: row.max,
      unit: row.unit === '' ? 'Stück' : row.unit,
      isConsumable: truthy(row.consumable),
      isReservable: row.reservable === '' || truthy(row.reservable),
      // an empty cell leaves what the team wrote in the app; it does not wipe it
      ...(row.description === '' ? {} : { description: row.description }),
      ...(row.returnInstructions === '' ? {} : { returnInstructions: row.returnInstructions }),
      ...(row.imageUrl === '' ? {} : { imageUrl: row.imageUrl }),
    };

    // `undefined` once written, otherwise the smallest total the article may have
    const blockedBelow = await prisma
      .$transaction(async (tx): Promise<number | undefined> => {
        const existing = await tx.materialItem.findUnique({ where: { code: row.code } });
        if (!existing) {
          await tx.materialItem.create({ data: { ...data, code: row.code } });
          created += 1;
          return undefined;
        }
        await tx.$queryRaw`SELECT 1 FROM "MaterialItem" WHERE id = ${existing.id} FOR UPDATE`;
        const { _sum } = await tx.materialLoan.aggregate({
          where: { itemId: existing.id, status: 'ISSUED', isConsumption: false },
          _sum: { issuedQuantity: true },
        });
        const bound =
          existing.damagedQuantity + existing.inRepairQuantity + (_sum.issuedQuantity ?? 0);
        if (data.totalQuantity < bound) return bound;
        await tx.materialItem.update({ where: { id: existing.id }, data });
        updated += 1;
        return undefined;
      })
      .catch((error: unknown) => {
        // the same code created in the app a moment ago: report the row, keep importing
        if (isKnownError(error, 'P2002')) return -1;
        throw error;
      });
    if (blockedBelow === -1) {
      problems.push(describe('importRowInvalid', { row: index + 1, fields: 'code' }));
      continue;
    }
    if (blockedBelow !== undefined) {
      problems.push(
        describe('importRowBelowStock', { row: index + 1, code: row.code, n: blockedBelow }),
      );
    }
  }

  logger.info('Material catalogue imported', {
    'material.import.created': created,
    'material.import.updated': updated,
    'material.import.skipped': problems.length,
  });
  if (problems.length === 0) {
    return { ok: true, message: 'importDone', values: { created, updated } };
  }
  return {
    ok: created + updated > 0,
    message: 'importPartial',
    values: {
      created,
      updated,
      skipped: problems.length,
      problems: problems.slice(0, 10).join('; '),
    },
  };
};
