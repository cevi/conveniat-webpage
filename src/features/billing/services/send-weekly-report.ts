import { ACCOUNTED_STATUSES } from '@/features/billing/services/billing-status';
import {
  buildFinanceOverviewRows,
  buildFinanceOverviewWorkbook,
} from '@/features/billing/services/finance-overview-export';
import { renderWeeklyReportPdf } from '@/features/billing/services/render-weekly-report';
import type { WeeklyReport } from '@/features/billing/services/weekly-report';
import { buildWeeklyReport } from '@/features/billing/services/weekly-report';
import type { Payload } from 'payload';

/** The scheduled-report settings, as stored on the `bill-settings` global. */
export interface ScheduledReportConfig {
  enabled?: boolean | null;
  weekday?: string | null;
  hour?: number | null;
  recipients?: string | null;
  attachPdf?: boolean | null;
  attachExcel?: boolean | null;
  subject?: string | null;
  body?: string | null;
  lastSentAt?: string | null;
}

export interface WeeklyReportSendSummary {
  sent: boolean;
  /** Why nothing was sent, when nothing was. */
  reason?: string | undefined;
  recipients?: string[] | undefined;
  attachments?: string[] | undefined;
}

/**
 * The task runs hourly; this decides whether *this* hour is the configured one.
 *
 * Payload's task schedule is a cron literal in code, so it cannot be moved by an operator.
 * The cron is therefore left coarse and the actual weekday and hour come from the
 * settings, which is what makes them editable in the admin.
 *
 * `lastSentAt` is the guard against sending twice: two replicas both reach this, and an
 * hourly cron will fire again inside the same configured hour if the first run was slow.
 * A send is refused if one already went out within six days.
 */
export function isReportDue(
  config: ScheduledReportConfig | null | undefined,
  now: Date,
): { due: boolean; reason?: string | undefined } {
  if (config?.enabled !== true) return { due: false, reason: 'Wochenbericht ist deaktiviert.' };

  const weekday = Number.parseInt(config.weekday ?? '1', 10);
  const hour = typeof config.hour === 'number' ? Math.trunc(config.hour) : 7;

  if (Number.isFinite(weekday) && now.getDay() !== weekday)
    return { due: false, reason: 'Heute ist nicht der konfigurierte Wochentag.' };
  if (now.getHours() !== hour)
    return { due: false, reason: 'Jetzt ist nicht die konfigurierte Stunde.' };

  const lastSentAt = config.lastSentAt;
  if (typeof lastSentAt === 'string' && lastSentAt !== '') {
    const last = new Date(lastSentAt);
    if (!Number.isNaN(last.getTime())) {
      const daysSince = (now.getTime() - last.getTime()) / 86_400_000;
      // Six rather than seven: a report sent an hour late last week must not push this
      // week's out of its window.
      if (daysSince < 6)
        return { due: false, reason: 'In dieser Woche wurde bereits ein Bericht versendet.' };
    }
  }

  return { due: true };
}

/** Splits the comma-separated recipient list an operator typed. */
export function parseRecipients(...lists: (string | null | undefined)[]): string[] {
  for (const list of lists) {
    const addresses = (list ?? '')
      .split(',')
      .map((address) => address.trim())
      .filter((address) => address !== '');
    if (addresses.length > 0) return addresses;
  }
  return [];
}

/** Fills the placeholders the subject and body may use. */
export function applyReportPlaceholders(template: string, report: WeeklyReport): string {
  return template
    .replaceAll('{{date}}', report.generatedAt.toLocaleDateString('de-CH'))
    .replaceAll('{{total}}', String(report.totals.participants))
    .replaceAll('{{new}}', String(report.newSinceLastWeek))
    .replaceAll('{{blocked}}', String(report.totals.blocked));
}

/**
 * Builds the weekly report and emails it.
 *
 * `force` skips the schedule check so an operator can trigger a send to check the wording
 * without waiting for the configured weekday.
 */
export async function sendWeeklyReport(
  payload: Payload,
  options: { force?: boolean } = {},
): Promise<WeeklyReportSendSummary> {
  const settings = await payload.findGlobal({ slug: 'bill-settings', context: { internal: true } });
  const config = (settings as { scheduledReport?: ScheduledReportConfig }).scheduledReport;
  const now = new Date();

  if (options.force !== true) {
    const due = isReportDue(config, now);
    if (!due.due) return { sent: false, reason: due.reason };
  }

  const recipients = parseRecipients(config?.recipients, settings.financeEmailRecipients);
  if (recipients.length === 0) return { sent: false, reason: 'Keine Empfänger konfiguriert.' };

  const participants = await payload.find({
    collection: 'bill-participants',
    where: {},
    limit: 10_000,
    context: { internal: true },
  });

  const report = buildWeeklyReport(participants.docs, now);
  const stamp = now.toISOString().slice(0, 10);
  const attachments: { filename: string; content: Buffer }[] = [];

  if (config?.attachPdf !== false) {
    attachments.push({
      filename: `anmeldestand-${stamp}.pdf`,
      content: await renderWeeklyReportPdf(report),
    });
  }

  if (config?.attachExcel !== false) {
    // The same workbook the toolbar's manual export produces, so the weekly mail and the
    // download can never drift apart.
    const billed = participants.docs.filter((participant) =>
      (ACCOUNTED_STATUSES as readonly string[]).includes(participant.status),
    );
    const rows = buildFinanceOverviewRows(billed, settings);
    attachments.push({
      filename: `rechnungsuebersicht-${stamp}.xlsx`,
      content: await buildFinanceOverviewWorkbook(rows, settings.currency ?? 'CHF'),
    });
  }

  const subject = applyReportPlaceholders(
    config?.subject ?? 'conveniat27 – Anmeldestand vom {{date}}',
    report,
  );
  const text = applyReportPlaceholders(config?.body ?? '', report);

  await payload.sendEmail({
    to: recipients.join(', '),
    subject,
    text,
    attachments,
  });

  await payload.updateGlobal({
    slug: 'bill-settings',
    context: { internal: true },
    data: {
      scheduledReport: { ...config, lastSentAt: now.toISOString() },
    } as never,
  });

  payload.logger.info(
    `Weekly billing report sent to ${String(recipients.length)} recipient(s) with ${String(attachments.length)} attachment(s).`,
  );

  return {
    sent: true,
    recipients,
    attachments: attachments.map((attachment) => attachment.filename),
  };
}
