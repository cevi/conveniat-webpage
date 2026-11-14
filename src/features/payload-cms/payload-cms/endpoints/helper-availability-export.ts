import { hasAdminOrWebAccess } from '@/features/payload-cms/payload-cms/access-rules/roles';
import { QUERY_LIMIT } from '@/features/payload-cms/payload-cms/endpoints/participation-export';
import type { HelperDays } from '@/features/payload-cms/payload-cms/utils/helper-availability';
import {
  buildHelperAvailability,
  getHelperFormBlocks,
} from '@/features/payload-cms/payload-cms/utils/helper-availability';
import type { HelperJob } from '@/features/payload-cms/payload-types';
import ExcelJS from 'exceljs';
import type { PayloadHandler } from 'payload';

const MARK = 'x';

/** `2027-07-12` as the UTC midnight Excel shows as that day, whatever the server's zone. */
const toExcelDate = (isoDay: string): Date => new Date(`${isoDay}T00:00:00.000Z`);

/**
 * One sheet in the layout the Ressorts plan with: a row per helper, a narrow column per camp
 * day with an `x` where the helper is on the Platz, and a `TOTAL` row counting the helpers of
 * each day. The header carries a filter, so a Ressort narrows the sheet to its own helpers.
 */
const addDaysSheet = (
  workbook: ExcelJS.Workbook,
  name: string,
  {
    days,
    helpers,
    personHeaders,
  }: { days: string[]; helpers: HelperDays[]; personHeaders: string[] },
  withJobs: boolean,
): void => {
  const leadingHeaders = [...personHeaders, 'Ressort', ...(withJobs ? ['Jobs'] : [])];
  const firstDayColumn = leadingHeaders.length + 1;
  const worksheet = workbook.addWorksheet(name, {
    views: [{ state: 'frozen', xSplit: leadingHeaders.length, ySplit: 1 }],
  });

  // Widths and alignment first: setting them on a column restyles the cells already in it.
  for (const [index] of leadingHeaders.entries()) {
    worksheet.getColumn(index + 1).width = 22;
  }
  for (const [index] of days.entries()) {
    const column = worksheet.getColumn(firstDayColumn + index);
    column.width = 3.4;
    column.alignment = { horizontal: 'center' };
  }

  const header = worksheet.addRow([...leadingHeaders, ...days.map((day) => toExcelDate(day))]);
  header.font = { bold: true };
  // Room for a date turned on its side; Excel does not grow a row for rotated text by itself.
  header.height = 62;
  for (const [index] of days.entries()) {
    const cell = header.getCell(firstDayColumn + index);
    cell.numFmt = 'dd.mm.yyyy';
    cell.alignment = { textRotation: 90, horizontal: 'center' };
  }

  for (const helper of helpers) {
    worksheet.addRow([
      ...helper.person,
      helper.ressort,
      ...(withJobs ? [helper.jobTitles.join(', ')] : []),
      // A day off stays an empty cell, not an empty string, which the total would count.
      ...days.map((day) => (helper.days.has(day) ? MARK : null)),
    ]);
  }

  // The filter covers the helpers but not the total, which stays visible under any filter.
  const lastHelperRow = helpers.length + 1;
  if (helpers.length > 0) {
    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: lastHelperRow, column: firstDayColumn + days.length - 1 },
    };
  }

  // SUBTOTAL(103, …) counts the marked cells of the rows the filter shows, so filtering by a
  // Ressort gives that Ressort's helpers per day. A formula also counts rows added by hand.
  // Without helpers the range would be the total row itself.
  const total = worksheet.addRow([
    'TOTAL',
    ...Array.from({ length: leadingHeaders.length - 1 }, () => ''),
    ...days.map((day, index) => {
      if (helpers.length === 0) return 0;
      const column = worksheet.getColumn(firstDayColumn + index).letter;
      return {
        formula: `SUBTOTAL(103,${column}2:${column}${lastHelperRow})`,
        result: helpers.filter((helper) => helper.days.has(day)).length,
      };
    }),
  ]);
  total.font = { bold: true };
};

/**
 * Exports the helpers of one helper form as an Excel workbook of the days they are on the
 * Platz: a sheet for those who signed up by availability ("Nach Verfügbarkeit") and one for
 * those who took a job, with the days of the job or the days they picked for it.
 *
 * The person columns are the answers named in `fields`, as in the PDF report.
 *
 * Exposed on the `helper-jobs` collection as `GET /api/helper-jobs/report/availability`.
 */
export const helperAvailabilityExportHandler: PayloadHandler = async (request) => {
  try {
    if (!hasAdminOrWebAccess({ req: request })) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url ?? '', 'http://localhost');
    const formId = url.searchParams.get('formId');
    if (formId === null || formId === '') {
      return Response.json({ error: 'Missing formId' }, { status: 400 });
    }
    const personFields = (url.searchParams.get('fields') ?? '').split(',').filter(Boolean);

    const form = await request.payload.findByID({ collection: 'forms', id: formId, depth: 0 });
    const blocks = getHelperFormBlocks(form.sections);

    const [submissions, jobs] = await Promise.all([
      request.payload.find({
        collection: 'form-submissions',
        where: { form: { equals: formId } },
        limit: QUERY_LIMIT,
        depth: 0,
        sort: 'createdAt',
      }),
      request.payload.find({ collection: 'helper-jobs', limit: QUERY_LIMIT, depth: 0 }),
    ]);

    const jobsById = new Map<string, HelperJob>(jobs.docs.map((job) => [job.id, job]));

    const { days, byAvailability, byJob } = buildHelperAvailability({
      blocks,
      submissions: submissions.docs.map((submission) => ({
        answers: submission.submissionData ?? [],
        jobIds: (submission['helper-jobs'] ?? []).map((job) =>
          typeof job === 'string' ? job : job.id,
        ),
      })),
      jobsById,
      personFields,
    });

    const personHeaders = personFields.length > 0 ? personFields : ['Person'];
    const workbook = new ExcelJS.Workbook();
    addDaysSheet(
      workbook,
      'Nach Verfügbarkeit',
      { days, helpers: byAvailability, personHeaders },
      false,
    );
    addDaysSheet(workbook, 'Feste Jobs', { days, helpers: byJob, personHeaders }, true);

    const buffer = await workbook.xlsx.writeBuffer();
    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="Helfende_nach_Verfuegbarkeit.xlsx"',
      },
    });
  } catch (error) {
    request.payload.logger.error({ err: error }, 'Failed to export helper availability');
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
};
