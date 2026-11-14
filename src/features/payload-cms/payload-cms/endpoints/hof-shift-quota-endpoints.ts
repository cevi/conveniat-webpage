import { canManageHelperShifts } from '@/features/payload-cms/payload-cms/access-rules/roles';
import type {
  CampDay,
  QuotaChange,
} from '@/features/payload-cms/payload-cms/utils/hof-shift-quotas';
import {
  listHofEnrolments,
  listQuotaShifts,
  loadQuotas,
  saveQuotas,
} from '@/features/payload-cms/payload-cms/utils/hof-shift-quotas';
import ExcelJS from 'exceljs';
import type { PayloadHandler, PayloadRequest } from 'payload';
import { z } from 'zod';

const CAMP_DAY = /^\d{4}-\d{2}-\d{2}$/;
const MAX_SLOTS = 999;

/** A Hof as a row of the grid. */
export interface QuotaGridHof {
  id: string;
  name: string;
  quartier: string | undefined;
}

/** What the quota grid in the admin panel shows. */
export interface QuotaGrid {
  /** the days that have at least one Schichteinsatz, in order */
  days: CampDay[];
  hoefe: QuotaGridHof[];
  /** `hofId → day → slots` */
  quotas: Record<string, Record<CampDay, number>>;
  /** the places of all shifts of a day, `null` when one of them takes any number */
  placesPerDay: Record<CampDay, number | null>;
  /** the enrolments that count for some Hof, per day */
  enrolledPerDay: Record<CampDay, number>;
}

const unauthorized = (): Response => Response.json({ error: 'Unauthorized' }, { status: 401 });

const listGridHoefe = async (request: PayloadRequest): Promise<QuotaGridHof[]> => {
  const { docs } = await request.payload.find({
    collection: 'hoefe',
    depth: 1,
    pagination: false,
    overrideAccess: true,
    select: { name: true, quartier: true },
    sort: 'name',
  });
  return docs.map((hof) => ({
    id: String(hof.id),
    name: String(hof.name),
    quartier:
      typeof hof.quartier === 'object' && hof.quartier !== null ? hof.quartier.name : undefined,
  }));
};

/** The grid of every Hof and every shift day. */
export const loadQuotaGrid = async (request: PayloadRequest): Promise<QuotaGrid> => {
  const [shifts, hoefe, quotas, enrolments] = await Promise.all([
    listQuotaShifts(request.payload),
    listGridHoefe(request),
    loadQuotas(),
    listHofEnrolments(),
  ]);
  const days = [...new Set(shifts.map((shift) => shift.day))].toSorted();
  const placesPerDay: Record<CampDay, number | null> = {};
  for (const shift of shifts) {
    const sum = placesPerDay[shift.day];
    placesPerDay[shift.day] =
      sum === null || shift.places === undefined ? null : (sum ?? 0) + shift.places;
  }
  const dayOfShift = new Map(shifts.map((shift) => [shift.id, shift.day]));
  const enrolledPerDay: Record<CampDay, number> = {};
  for (const enrolment of enrolments) {
    const day = dayOfShift.get(enrolment.shiftId);
    // as for the AVP: a marked no-show no longer counts
    if (day !== undefined && enrolment.attendance !== 'ABSENT') {
      enrolledPerDay[day] = (enrolledPerDay[day] ?? 0) + 1;
    }
  }
  return {
    days,
    hoefe,
    quotas: Object.fromEntries(
      [...quotas].map(([hofId, ofHof]) => [hofId, Object.fromEntries(ofHof)]),
    ),
    placesPerDay,
    enrolledPerDay,
  };
};

/** `GET /api/helper-shifts/quotas`: the grid. */
export const getQuotaGridHandler: PayloadHandler = async (request) => {
  if (!canManageHelperShifts({ req: request })) return unauthorized();
  return Response.json(await loadQuotaGrid(request));
};

const changesSchema = z.object({
  changes: z
    .array(
      z.object({
        hofId: z.string().min(1),
        day: z.string().regex(CAMP_DAY),
        slots: z.number().int().min(0).max(MAX_SLOTS).nullable(),
      }),
    )
    .max(5000),
});

/** `PATCH /api/helper-shifts/quotas`: writes the changed cells. */
export const saveQuotaGridHandler: PayloadHandler = async (request) => {
  if (!canManageHelperShifts({ req: request })) return unauthorized();
  const parsed = changesSchema.safeParse(request.json ? await request.json() : undefined);
  if (!parsed.success) return Response.json({ error: 'Invalid quotas' }, { status: 400 });
  await saveQuotas(parsed.data.changes, request.user?.id);
  request.payload.logger.info({
    msg: 'Saved Hof shift quotas',
    changes: parsed.data.changes.length,
  });
  return Response.json(await loadQuotaGrid(request));
};

/** The header of the Hof column in the workbook, which the import looks for. */
const HOF_HEADER = 'Hof';
const QUARTIER_HEADER = 'Quartier';

/** `YYYY-MM-DD` as the workbook's column header, e.g. `Mo 26.07.2027`. */
const dayHeader = (day: CampDay): string => {
  const date = new Date(`${day}T12:00:00Z`);
  const weekday = new Intl.DateTimeFormat('de-CH', { weekday: 'short', timeZone: 'UTC' })
    .format(date)
    .replace('.', '');
  return `${weekday} ${day.slice(8, 10)}.${day.slice(5, 7)}.${day.slice(0, 4)}`;
};

/** The day a column header names, read back from `dd.mm.yyyy` anywhere in it. */
const dayOfHeader = (header: string): CampDay | undefined => {
  const match = /(\d{2})\.(\d{2})\.(\d{4})/.exec(header);
  return match === null ? undefined : `${match[3]}-${match[2]}-${match[1]}`;
};

/** `GET /api/helper-shifts/quotas/export`: the grid as an Excel workbook to fill in. */
export const exportQuotaGridHandler: PayloadHandler = async (request) => {
  if (!canManageHelperShifts({ req: request })) return unauthorized();
  const grid = await loadQuotaGrid(request);
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Kontingente');
  sheet.addRow([HOF_HEADER, QUARTIER_HEADER, ...grid.days.map((day) => dayHeader(day))]);
  sheet.getRow(1).font = { bold: true };
  for (const hof of grid.hoefe) {
    sheet.addRow([
      hof.name,
      hof.quartier ?? '',
      ...grid.days.map((day) => grid.quotas[hof.id]?.[day] ?? null),
    ]);
  }
  sheet.getColumn(1).width = 28;
  sheet.getColumn(2).width = 22;
  const buffer = await workbook.xlsx.writeBuffer();
  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="Schicht-Kontingente.xlsx"',
    },
  });
};

/** What an uploaded workbook would change, for the grid to show before anything is saved. */
export interface QuotaImport {
  changes: QuotaChange[];
  /** Hof names in the workbook that match no Hof */
  unknownHoefe: string[];
  /** cells that hold something other than a whole number from 0 */
  invalidCells: string[];
}

const cellText = (value: ExcelJS.CellValue): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean') {
    return String(value);
  }
  if (value instanceof Date) return value.toISOString();
  if ('result' in value) {
    const { result } = value;
    return typeof result === 'number' || typeof result === 'string' ? String(result) : '';
  }
  if ('richText' in value) return value.richText.map((part) => part.text).join('');
  return '';
};

/**
 * `POST /api/helper-shifts/quotas/import`, with the workbook as the request body: reads the
 * layout of the export back into changes of the grid. Nothing is saved here; the grid shows the
 * changes and the Helferpool saves them like edits made by hand.
 */
export const importQuotaGridHandler: PayloadHandler = async (request) => {
  if (!canManageHelperShifts({ req: request })) return unauthorized();
  const body = request.arrayBuffer ? await request.arrayBuffer() : undefined;
  if (body === undefined || body.byteLength === 0 || body.byteLength > 5_000_000) {
    return Response.json({ error: 'Missing or too large workbook' }, { status: 400 });
  }

  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(body);
  } catch {
    return Response.json({ error: 'Not an Excel workbook' }, { status: 400 });
  }
  const sheet = workbook.worksheets[0];
  if (sheet === undefined) return Response.json({ error: 'Empty workbook' }, { status: 400 });

  const hoefe = await listGridHoefe(request);
  const hofByName = new Map(hoefe.map((hof) => [hof.name.trim().toLowerCase(), hof.id]));

  const header = sheet.getRow(1);
  const dayColumns: { column: number; day: CampDay }[] = [];
  let hofColumn: number | undefined;
  header.eachCell((cell, column) => {
    const text = cellText(cell.value).trim();
    if (text === HOF_HEADER) hofColumn = column;
    const day = dayOfHeader(text);
    if (day !== undefined) dayColumns.push({ column, day });
  });
  if (hofColumn === undefined || dayColumns.length === 0) {
    return Response.json({ error: 'No Hof column or no day columns' }, { status: 400 });
  }

  const result: QuotaImport = { changes: [], unknownHoefe: [], invalidCells: [] };
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1 || hofColumn === undefined) return;
    const name = cellText(row.getCell(hofColumn).value).trim();
    if (name === '') return;
    const hofId = hofByName.get(name.toLowerCase());
    if (hofId === undefined) {
      result.unknownHoefe.push(name);
      return;
    }
    for (const { column, day } of dayColumns) {
      const text = cellText(row.getCell(column).value).trim();
      if (text === '') {
        result.changes.push({ hofId, day, slots: null });
        continue;
      }
      const slots = Number(text);
      if (!Number.isInteger(slots) || slots < 0 || slots > MAX_SLOTS) {
        result.invalidCells.push(`${name}, ${dayHeader(day)}: ${text}`);
        continue;
      }
      result.changes.push({ hofId, day, slots });
    }
  });

  return Response.json(result);
};
