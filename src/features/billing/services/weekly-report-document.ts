import { renderWeeklyReportPdf } from '@/features/billing/services/render-weekly-report';
import type { WeeklyReport } from '@/features/billing/services/weekly-report';
import type { BillParticipant } from '@/features/payload-cms/payload-types';
import type { Payload } from 'payload';

/**
 * The weekly report PDF as a file, shared by the mail that attaches it and the admin
 * panel that downloads it on demand.
 *
 * Both go through here so what an operator downloads is the report the recipients get,
 * rather than a second rendering that drifts from it.
 */

/** Loads every registration the weekly report counts. */
export async function findWeeklyReportParticipants(payload: Payload): Promise<BillParticipant[]> {
  const participants = await payload.find({
    collection: 'bill-participants',
    where: {},
    limit: 10_000,
    context: { internal: true },
  });
  return participants.docs;
}

/** Renders the report and names the file the way the weekly mail attaches it. */
export async function buildWeeklyReportAttachment(
  report: WeeklyReport,
): Promise<{ filename: string; content: Buffer }> {
  return {
    filename: `anmeldestand-${report.generatedAt.toISOString().slice(0, 10)}.pdf`,
    content: await renderWeeklyReportPdf(report),
  };
}
