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
  financeSubject?: string | null;
  financeBody?: string | null;
  lastSentAt?: string | null;
}

export interface WeeklyReportSendSummary {
  sent: boolean;
  /** Why nothing was sent, when nothing was. */
  reason?: string | undefined;
  recipients?: string[] | undefined;
  attachments?: string[] | undefined;
  generalRecipients?: string[] | undefined;
  financeRecipients?: string[] | undefined;
}

export interface SendWeeklyReportOptions {
  /** Skips the schedule check so an operator can trigger a test send. */
  force?: boolean | undefined;
  /**
   * Identifies the run across workers. Passed to the run lock so duplicate worker
   * executions of the same job can be recognised and silently skipped.
   */
  runOwner?: string | undefined;
  /** Overrides current timestamp (useful for testing or simulation). */
  now?: Date | undefined;
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
  if (config?.enabled !== true) return { due: false, reason: 'Weekly report is disabled.' };

  const weekday = Number.parseInt(config.weekday ?? '1', 10);
  const hour = typeof config.hour === 'number' ? Math.trunc(config.hour) : 7;

  if (Number.isFinite(weekday) && now.getDay() !== weekday)
    return { due: false, reason: 'Today is not the configured weekday.' };
  if (now.getHours() !== hour)
    return { due: false, reason: 'Current hour is not the configured hour.' };

  const lastSentAt = config.lastSentAt;
  if (typeof lastSentAt === 'string' && lastSentAt !== '') {
    const last = new Date(lastSentAt);
    if (!Number.isNaN(last.getTime())) {
      const daysSince = (now.getTime() - last.getTime()) / 86_400_000;
      // Six rather than seven: a report sent an hour late last week must not push this
      // week's out of its window.
      if (daysSince < 6) return { due: false, reason: 'A report has already been sent this week.' };
    }
  }

  return { due: true };
}

/** Splits the comma-separated recipient list an operator typed. */
export function parseRecipients(...lists: (string | null | undefined)[]): string[] {
  for (const list of lists) {
    const addresses = (list ?? '')
      .split(/[,;]/)
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
 * Clean separation between General Report and Finance Mail:
 * - `config.recipients` receives the general registration report (PDF).
 *   Crucially, this email NEVER contains the confidential billing Excel sheet.
 * - `settings.financeEmailRecipients` receives the finance overview with the Excel sheet
 *   (and the overview PDF).
 *
 * Uses a Redis run lock (`BillingTaskSlug.SendWeeklyReport`) to guarantee that only one
 * worker across all replicas can build and send the report simultaneously.
 */
export async function sendWeeklyReport(
  payload: Payload,
  options: SendWeeklyReportOptions = {},
): Promise<WeeklyReportSendSummary> {
  const settings = await payload.findGlobal({ slug: 'bill-settings', context: { internal: true } });
  const config = (settings as { scheduledReport?: ScheduledReportConfig }).scheduledReport;
  const now = options.now ?? new Date();

  if (options.force !== true) {
    const due = isReportDue(config, now);
    if (!due.due) return { sent: false, reason: due.reason };
  }

  const generalRecipients = parseRecipients(config?.recipients);
  const financeRecipients = parseRecipients(settings.financeEmailRecipients);

  if (generalRecipients.length === 0 && financeRecipients.length === 0) {
    return { sent: false, reason: 'No recipients configured.' };
  }

  // Acquire run lock across replicas
  const { RedisRunLockAdapter } =
    await import('@/features/billing/adapters/redis-run-lock.adapter');
  const { classifyLockConflict } = await import('@/features/billing/ports/run-lock.port');
  const { BillingTaskSlug } = await import('@/features/billing/types');
  const { randomUUID } = await import('node:crypto');

  const owner = options.runOwner ?? `request:${randomUUID()}`;
  let lockRelease: () => Promise<void>;

  try {
    const lockResult = await new RedisRunLockAdapter().acquire(
      BillingTaskSlug.SendWeeklyReport,
      15 * 60, // 15 minutes TTL
      owner,
    );

    if (!lockResult.acquired) {
      if (classifyLockConflict(lockResult.heldBy, owner) === 'duplicate-worker') {
        payload.logger.info(
          `Weekly report for job ${owner} is already running on another worker; skipping duplicate execution.`,
        );
        return {
          sent: false,
          reason: 'Weekly report is already running on another worker.',
        };
      }

      payload.logger.warn(
        `Refused to start weekly report for ${owner}: run ${lockResult.heldBy ?? 'unknown'} holds the lock.`,
      );
      return {
        sent: false,
        reason: `Weekly report is already running (held by ${lockResult.heldBy ?? 'unknown'}).`,
      };
    }
    lockRelease = lockResult.lock.release;
  } catch (error) {
    payload.logger.error({
      err: error instanceof Error ? error : new Error(String(error)),
      msg: 'Failed to acquire Redis run lock for weekly report. Skipping execution.',
    });
    return {
      sent: false,
      reason: 'Failed to acquire Redis run lock for weekly report.',
    };
  }

  try {
    const participants = await payload.find({
      collection: 'bill-participants',
      where: {},
      limit: 10_000,
      context: { internal: true },
    });

    const report = buildWeeklyReport(participants.docs, now);
    const stamp = now.toISOString().slice(0, 10);

    // 1. Prepare PDF attachment if enabled
    let pdfAttachment: { filename: string; content: Buffer } | undefined;
    if (config?.attachPdf !== false) {
      pdfAttachment = {
        filename: `anmeldestand-${stamp}.pdf`,
        content: await renderWeeklyReportPdf(report),
      };
    }

    // 2. Prepare Excel attachment if enabled and finance recipients exist
    let excelAttachment: { filename: string; content: Buffer } | undefined;
    if (config?.attachExcel !== false && financeRecipients.length > 0) {
      const billed = participants.docs.filter((participant) =>
        (ACCOUNTED_STATUSES as readonly string[]).includes(participant.status),
      );
      const rows = buildFinanceOverviewRows(billed, settings);
      excelAttachment = {
        filename: `rechnungsuebersicht-${stamp}.xlsx`,
        content: await buildFinanceOverviewWorkbook(rows, settings.currency ?? 'CHF'),
      };
    }

    const sentAttachments: string[] = [];

    // 3. Send General Registration Report (ONLY PDF, NEVER EXCEL)
    if (generalRecipients.length > 0) {
      const generalAttachments = pdfAttachment ? [pdfAttachment] : [];
      const subject = applyReportPlaceholders(
        config?.subject ?? 'conveniat27 – Anmeldestand vom {{date}}',
        report,
      );
      const text = applyReportPlaceholders(config?.body ?? '', report);

      await payload.sendEmail({
        to: generalRecipients.join(', '),
        subject,
        text,
        attachments: generalAttachments,
      });

      for (const attachment of generalAttachments) {
        if (!sentAttachments.includes(attachment.filename)) {
          sentAttachments.push(attachment.filename);
        }
      }

      payload.logger.info(
        `General weekly report sent to ${String(generalRecipients.length)} recipient(s) with ${String(generalAttachments.length)} attachment(s).`,
      );
    }

    // 4. Send Finance Overview Mail (WITH EXCEL and PDF)
    if (financeRecipients.length > 0 && config?.attachExcel !== false) {
      const financeAttachments: { filename: string; content: Buffer }[] = [];
      if (pdfAttachment) financeAttachments.push(pdfAttachment);
      if (excelAttachment) financeAttachments.push(excelAttachment);

      const defaultFinanceBody =
        'Guten Morgen\n\nAnbei die aktuelle Rechnungsübersicht für das conveniat27.\n\nAngemeldet: {{total}}\nNeu diese Woche: {{new}}\nNoch nicht verrechenbar: {{blocked}}\n\nDie detaillierten Buchungszeilen befinden sich in der angehängten Excel-Datei.\n\nFreundliche Grüsse\nconveniat27 – Ressort Finanzen';

      const subject = applyReportPlaceholders(
        config?.financeSubject ?? 'conveniat27 – Rechnungsübersicht vom {{date}}',
        report,
      );
      const text = applyReportPlaceholders(config?.financeBody ?? defaultFinanceBody, report);

      await payload.sendEmail({
        to: financeRecipients.join(', '),
        subject,
        text,
        attachments: financeAttachments,
      });

      for (const attachment of financeAttachments) {
        if (!sentAttachments.includes(attachment.filename)) {
          sentAttachments.push(attachment.filename);
        }
      }

      payload.logger.info(
        `Finance weekly report sent to ${String(financeRecipients.length)} recipient(s) with ${String(financeAttachments.length)} attachment(s).`,
      );
    }

    await payload.updateGlobal({
      slug: 'bill-settings',
      context: { internal: true },
      data: {
        scheduledReport: { ...config, lastSentAt: now.toISOString() },
      } as never,
    });

    const allRecipients = [...new Set([...generalRecipients, ...financeRecipients])];

    return {
      sent: true,
      recipients: allRecipients,
      attachments: sentAttachments,
      generalRecipients,
      financeRecipients,
    };
  } finally {
    try {
      await lockRelease();
    } catch (error) {
      payload.logger.error({
        err: error instanceof Error ? error : new Error(String(error)),
        msg: 'Failed to release Redis run lock for weekly report.',
      });
    }
  }
}
