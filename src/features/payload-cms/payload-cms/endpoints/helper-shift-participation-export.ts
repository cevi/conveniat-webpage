import { canAccessAdminPanel } from '@/features/payload-cms/payload-cms/access-rules/can-access-admin-panel';
import type { LocaleCode } from '@/features/payload-cms/payload-cms/locales';
import { LOCALE, enabledLocales } from '@/features/payload-cms/payload-cms/locales';
import type {
  HelperShiftParticipant,
  HelperShiftParticipationRow,
  HelperShiftSummary,
} from '@/features/payload-cms/payload-cms/utils/helper-shift-participation';
import { aggregateHelperShiftParticipation } from '@/features/payload-cms/payload-cms/utils/helper-shift-participation';
import prisma from '@/lib/db/prisma';
import { CourseType } from '@/lib/prisma';
import ExcelJS from 'exceljs';
import type { PayloadHandler, PayloadRequest } from 'payload';

/** Upper bound for the collection queries; the camp has far fewer shifts and users than this. */
const QUERY_LIMIT = 10_000;

/** Users are looked up by explicit id list, which we chunk to keep the query string bounded. */
const USER_LOOKUP_CHUNK_SIZE = 200;

const EXPORT_COLUMNS: { header: string; key: keyof HelperShiftParticipationRow; width: number }[] =
  [
    { header: 'Vorname', key: 'firstName', width: 20 },
    { header: 'Nachname', key: 'lastName', width: 22 },
    { header: 'Ceviname', key: 'nickname', width: 20 },
    { header: 'E-Mail', key: 'email', width: 32 },
    { header: 'Anzahl Schichteinsätze', key: 'shiftCount', width: 20 },
    { header: 'Stunden total', key: 'totalHours', width: 14 },
    { header: 'Schichteinsätze', key: 'shiftTitles', width: 80 },
  ];

/**
 * Resolves the locale the shift titles should be exported in, defaulting to German — the language
 * the admin panel is run in and the only locale guaranteed to have a title (`fallback` is off).
 */
const resolveLocale = (requested: string | null): LocaleCode =>
  enabledLocales.find((locale) => locale === requested) ?? LOCALE.DE;

/**
 * Loads the Payload users for the given ids, in chunks.
 */
const findParticipants = async (
  request: PayloadRequest,
  userIds: string[],
): Promise<HelperShiftParticipant[]> => {
  const participants: HelperShiftParticipant[] = [];

  for (let index = 0; index < userIds.length; index += USER_LOOKUP_CHUNK_SIZE) {
    const chunk = userIds.slice(index, index + USER_LOOKUP_CHUNK_SIZE);
    const result = await request.payload.find({
      collection: 'users',
      where: { id: { in: chunk } },
      limit: chunk.length,
      depth: 0,
    });

    participants.push(
      ...result.docs.map((user) => ({
        id: user.id,
        fullName: user.fullName,
        nickname: user.nickname,
        email: user.email,
      })),
    );
  }

  return participants;
};

/**
 * Exports an Excel workbook listing every helper that is enrolled in at least one helper shift,
 * together with their contact details, the number of shifts, the total hours derived from the
 * shift time slots and the titles of those shifts.
 *
 * Exposed on the `helper-shifts` collection as `GET /api/helper-shifts/participation-export`.
 */
export const helperShiftParticipationExportHandler: PayloadHandler = async (request) => {
  try {
    const hasAccess = await canAccessAdminPanel({ req: request });
    if (!hasAccess) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const parsedUrl = new URL(request.url ?? '', 'http://localhost');
    const locale = resolveLocale(parsedUrl.searchParams.get('locale'));

    const shiftsResult = await request.payload.find({
      collection: 'helper-shifts',
      limit: QUERY_LIMIT,
      depth: 0,
      locale,
    });

    const shifts: HelperShiftSummary[] = shiftsResult.docs.map((shift) => ({
      id: shift.id,
      title: shift.title,
      date: shift.timeslot.date,
      time: shift.timeslot.time,
    }));

    const enrollments = await prisma.enrollment.findMany({
      where: { courseType: CourseType.SHIFT },
      select: { userId: true, courseId: true },
    });

    const userIds = [...new Set(enrollments.map((enrollment) => enrollment.userId))];
    const participants = await findParticipants(request, userIds);

    const rows = aggregateHelperShiftParticipation({ shifts, enrollments, participants });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Schichteinsätze');

    worksheet.columns = EXPORT_COLUMNS.map(({ header, key, width }) => ({ header, key, width }));
    worksheet.getRow(1).font = { bold: true };

    for (const row of rows) {
      worksheet.addRow(row);
    }

    const buffer = await workbook.xlsx.writeBuffer();

    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="Schichteinsaetze_Helfende.xlsx"',
      },
    });
  } catch (error) {
    request.payload.logger.error({ err: error }, 'Failed to export helper shift participation');
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
};
