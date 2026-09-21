/**
 * Shared plumbing behind the participation exports: resolving the export locale, loading the
 * Payload users behind a set of ids, and turning aggregated rows into an Excel response.
 *
 * The aggregation itself lives in `utils/course-participation.ts`.
 */

import type { LocaleCode } from '@/features/payload-cms/payload-cms/locales';
import { LOCALE, enabledLocales } from '@/features/payload-cms/payload-cms/locales';
import type {
  CourseParticipant,
  CourseParticipationRow,
} from '@/features/payload-cms/payload-cms/utils/course-participation';
import ExcelJS from 'exceljs';
import type { PayloadRequest } from 'payload';

/** Upper bound for the collection queries; the camp has far fewer courses and users than this. */
export const QUERY_LIMIT = 10_000;

/** Users are looked up by explicit id list, which we chunk to keep the query string bounded. */
const USER_LOOKUP_CHUNK_SIZE = 200;

/** Column headers that differ between the exports. */
export interface ParticipationExportLabels {
  /** Name of the worksheet, e.g. `Schichteinsätze`. */
  worksheetName: string;
  /** File name of the download, including the `.xlsx` extension. */
  fileName: string;
  /** Header of the course count column, e.g. `Anzahl Schichteinsätze`. */
  countHeader: string;
  /** Header of the course title column, e.g. `Schichteinsätze`. */
  titlesHeader: string;
}

/**
 * Resolves the locale the course titles should be exported in, defaulting to German — the language
 * the admin panel is run in and the only locale guaranteed to have a title (`fallback` is off).
 */
export const resolveExportLocale = (request: PayloadRequest): LocaleCode => {
  const parsedUrl = new URL(request.url ?? '', 'http://localhost');
  const requested = parsedUrl.searchParams.get('locale');

  return enabledLocales.find((locale) => locale === requested) ?? LOCALE.DE;
};

/**
 * Loads the Payload users for the given ids, in chunks.
 */
export const findExportParticipants = async (
  request: PayloadRequest,
  userIds: string[],
): Promise<CourseParticipant[]> => {
  const participants: CourseParticipant[] = [];

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
 * Renders the aggregated rows into a single sheet workbook and returns it as a file download.
 */
export const participationWorkbookResponse = async (
  rows: CourseParticipationRow[],
  { worksheetName, fileName, countHeader, titlesHeader }: ParticipationExportLabels,
): Promise<Response> => {
  const columns: { header: string; key: keyof CourseParticipationRow; width: number }[] = [
    { header: 'Vorname', key: 'firstName', width: 20 },
    { header: 'Nachname', key: 'lastName', width: 22 },
    { header: 'Ceviname', key: 'nickname', width: 20 },
    { header: 'E-Mail', key: 'email', width: 32 },
    { header: countHeader, key: 'courseCount', width: 22 },
    { header: 'Stunden total', key: 'totalHours', width: 14 },
    { header: titlesHeader, key: 'courseTitles', width: 80 },
  ];

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(worksheetName);

  worksheet.columns = columns.map(({ header, key, width }) => ({ header, key, width }));
  worksheet.getRow(1).font = { bold: true };

  for (const row of rows) {
    worksheet.addRow(row);
  }

  const buffer = await workbook.xlsx.writeBuffer();

  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${fileName}"`,
    },
  });
};
