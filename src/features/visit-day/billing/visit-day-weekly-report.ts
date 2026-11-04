import { formatChf } from '@/features/billing-core/money';
import { isWeeklySlotDue } from '@/features/billing-core/weekly-slot';
import { queueBackgroundEmail } from '@/features/payload-cms/payload-cms/utils/email-outbox';
import type { VisitDayBill, VisitDayBillEvent } from '@/features/payload-cms/payload-types';
import { countTakenPlaces } from '@/features/visit-day/api/visit-day-places';
import { VISIT_DAY_BILL_COLLECTION } from '@/features/visit-day/billing/visit-day-bill-booking';
import type { VisitDay } from '@/features/visit-day/visit-day-settings';
import { loadVisitDaySettings } from '@/features/visit-day/visit-day-settings';
import prisma from '@/lib/db/prisma';
import { redis } from '@/lib/db/redis';
import { campClockOf } from '@/utils/camp-clock';
import type { Payload } from 'payload';

/** One Besuchstag in the weekly report. */
export interface VisitDayReportDay {
  /** `YYYY-MM-DD` */
  date: string;
  capacity: number;
  capacityWithoutLunch: number;
  takenWithLunch: number;
  takenWithoutLunch: number;
  bills: number;
  paid: number;
  open: number;
  openAmount: number;
}

export interface VisitDayReport {
  generatedAt: Date;
  days: VisitDayReportDay[];
  totals: {
    registrations: number;
    paidAmount: number;
    openAmount: number;
    refunds: number;
    refundAmount: number;
    mailFailed: number;
    cancelled: number;
  };
  /** what happened in the seven days before the report */
  lastWeek: { registrations: number; payments: number; cancellations: number; reductions: number };
}

type ReportBill = Pick<
  VisitDayBill,
  'visitDate' | 'status' | 'invoiceAmount' | 'paidAmount' | 'refundDue' | 'mailStatus'
>;
type ReportEvent = Pick<VisitDayBillEvent, 'action' | 'createdAt'>;

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const sum = (values: number[]): number =>
  Math.round(values.reduce((total, value) => total + value * 100, 0)) / 100;

/**
 * Lays out where the Besuchstag stands: for every day its places against its capacity and its
 * bills, and in total what is paid, what is open and what has to go back. A cancelled
 * registration counts only as cancelled.
 */
export const buildVisitDayReport = (
  days: VisitDay[],
  taken: Map<string, { withLunch: number; withoutLunch: number }>,
  bills: ReportBill[],
  events: ReportEvent[],
  now: Date,
): VisitDayReport => {
  const active = bills.filter((bill) => bill.status !== 'cancelled');
  const weekAgo = now.getTime() - WEEK_MS;
  const recent = events.filter((event) => new Date(event.createdAt).getTime() >= weekAgo);
  const countRecent = (action: ReportEvent['action']): number =>
    recent.filter((event) => event.action === action).length;

  return {
    generatedAt: now,
    days: days
      .toSorted((a, b) => a.date.localeCompare(b.date))
      .map((day) => {
        const onDay = active.filter(
          (bill) => campClockOf(new Date(bill.visitDate)).dayKey === day.date,
        );
        const open = onDay.filter((bill) => bill.status === 'open');
        return {
          date: day.date,
          capacity: day.capacity,
          capacityWithoutLunch: day.capacityWithoutLunch,
          takenWithLunch: taken.get(day.date)?.withLunch ?? 0,
          takenWithoutLunch: taken.get(day.date)?.withoutLunch ?? 0,
          bills: onDay.length,
          paid: onDay.filter((bill) => bill.status === 'paid').length,
          open: open.length,
          openAmount: sum(open.map((bill) => bill.invoiceAmount)),
        };
      }),
    totals: {
      registrations: active.length,
      paidAmount: sum(
        active
          .filter((bill) => bill.status === 'paid')
          .map((bill) => bill.paidAmount ?? bill.invoiceAmount),
      ),
      openAmount: sum(
        active.filter((bill) => bill.status === 'open').map((bill) => bill.invoiceAmount),
      ),
      refunds: bills.filter((bill) => (bill.refundDue ?? 0) > 0).length,
      refundAmount: sum(bills.map((bill) => bill.refundDue ?? 0)),
      mailFailed: active.filter((bill) => bill.mailStatus === 'failed').length,
      cancelled: bills.length - active.length,
    },
    lastWeek: {
      registrations: countRecent('created'),
      payments: countRecent('payment_booked'),
      cancellations: countRecent('cancelled'),
      reductions: countRecent('persons_reduced'),
    },
  };
};

const formatDay = (day: string): string =>
  new Intl.DateTimeFormat('de-CH', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${day}T00:00:00.000Z`));

/** The report as a one-page PDF, in German like the camp's weekly report. */
export async function renderVisitDayReportPdf(report: VisitDayReport): Promise<Buffer> {
  const { default: PDFDocument } = await import('pdfkit');
  return new Promise((resolve, reject) => {
    const buffers: Buffer[] = [];
    const document_ = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 40 });
    document_.on('data', (chunk: Buffer) => buffers.push(chunk));
    document_.on('end', () => resolve(Buffer.concat(buffers)));
    document_.on('error', reject);

    document_.font('Helvetica-Bold').fontSize(18).text('Besuchstag · Stand der Anmeldungen');
    document_
      .font('Helvetica')
      .fontSize(10)
      .text(
        `Erstellt am ${report.generatedAt.toLocaleString('de-CH', { timeZone: 'Europe/Zurich' })}`,
      );
    document_.moveDown();

    const columns = [
      'Tag',
      'Plätze mit / ohne',
      'belegt mit / ohne',
      'Anmeldungen',
      'bezahlt',
      'offen',
      'CHF offen',
    ];
    const widths = [120, 110, 110, 90, 70, 70, 90];
    const drawRow = (cells: string[], bold: boolean): void => {
      const y = document_.y;
      let x = 40;
      document_.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(10);
      for (const [index, cell] of cells.entries()) {
        document_.text(cell, x, y, {
          width: widths[index] ?? 80,
          align: index === 0 ? 'left' : 'right',
        });
        x += widths[index] ?? 80;
      }
      document_.y = y + 18;
    };
    drawRow(columns, true);
    for (const day of report.days) {
      drawRow(
        [
          formatDay(day.date),
          `${String(day.capacity)} / ${String(day.capacityWithoutLunch)}`,
          `${String(day.takenWithLunch)} / ${String(day.takenWithoutLunch)}`,
          String(day.bills),
          String(day.paid),
          String(day.open),
          formatChf(day.openAmount),
        ],
        false,
      );
    }

    document_.moveDown();
    const { totals, lastWeek } = report;
    document_.x = 40;
    document_.font('Helvetica').fontSize(11);
    for (const line of [
      `Anmeldungen: ${String(totals.registrations)}, storniert: ${String(totals.cancelled)}`,
      `Eingegangen: ${formatChf(totals.paidAmount)} · offen: ${formatChf(totals.openAmount)}`,
      `Rückerstattungen offen: ${String(totals.refunds)} (${formatChf(totals.refundAmount)})`,
      `Rechnungs-E-Mails fehlgeschlagen: ${String(totals.mailFailed)}`,
      `Letzte 7 Tage: ${String(lastWeek.registrations)} Anmeldungen, ${String(lastWeek.payments)} Zahlungen, ` +
        `${String(lastWeek.cancellations)} Stornierungen, ${String(lastWeek.reductions)} Reduktionen`,
    ]) {
      document_.text(line, 40);
    }
    document_.end();
  });
}

/** Loads everything the report needs. */
export async function findVisitDayReport(payload: Payload, now: Date): Promise<VisitDayReport> {
  const settings = await loadVisitDaySettings(payload);
  const { docs: bills } = await payload.find({
    collection: VISIT_DAY_BILL_COLLECTION,
    pagination: false,
    depth: 0,
    joins: false,
    overrideAccess: true,
  });
  const { docs: events } = await payload.find({
    collection: 'visit-day-bill-events',
    where: { createdAt: { greater_than_equal: new Date(now.getTime() - WEEK_MS).toISOString() } },
    pagination: false,
    depth: 0,
    select: { action: true, createdAt: true },
    overrideAccess: true,
  });
  return buildVisitDayReport(settings.days, await countTakenPlaces(prisma), bills, events, now);
}

/**
 * Mails the Besuchstag report to its own recipients in the slot the Besuchstag bill settings
 * name. Runs from the hourly weekly report task next to the camp report, and decides for itself
 * whether this is its hour. A Redis lock on the hour keeps two replicas from both sending.
 */
export async function sendVisitDayWeeklyReport(
  payload: Payload,
  now: Date = new Date(),
): Promise<{ sent: boolean; reason?: string }> {
  const settings = await payload.findGlobal({
    slug: 'visit-day-bill-settings',
    depth: 0,
    overrideAccess: true,
  });
  const config = settings.weeklyReport;
  const recipients = (config?.recipients ?? []).map((recipient) => recipient.email);
  const due = isWeeklySlotDue(
    {
      enabled: recipients.length > 0,
      weekday: config?.weekday ?? '1',
      hour: config?.hour ?? 7,
      ...(typeof config?.lastSentAt === 'string' ? { lastSentAt: config.lastSentAt } : {}),
    },
    now,
  );
  if (!due.due) return { sent: false, ...(due.reason === undefined ? {} : { reason: due.reason }) };

  const hour = Math.floor(now.getTime() / 3_600_000);
  if ((await redis.set(`visitDayWeeklyReport:${String(hour)}`, '1', 'EX', 3300, 'NX')) !== 'OK') {
    return { sent: false, reason: 'Another worker sends this hour’s report.' };
  }

  const report = await findVisitDayReport(payload, now);
  const pdf = await renderVisitDayReportPdf(report);
  const stamp = now.toISOString().slice(0, 10);
  await queueBackgroundEmail(payload, {
    to: recipients,
    subject: `conveniat27 – Besuchstag, Stand vom ${now.toLocaleDateString('de-CH', { timeZone: 'Europe/Zurich' })}`,
    text:
      `Anmeldungen: ${String(report.totals.registrations)}, bezahlt ${formatChf(report.totals.paidAmount)}, ` +
      `offen ${formatChf(report.totals.openAmount)}. Details im Anhang.`,
    attachments: [
      { filename: `besuchstag-${stamp}.pdf`, content: pdf, contentType: 'application/pdf' },
    ],
  });
  await payload.updateGlobal({
    slug: 'visit-day-bill-settings',
    overrideAccess: true,
    data: { weeklyReport: { ...config, lastSentAt: now.toISOString() } },
  });
  payload.logger.info(
    `Besuchstag weekly report queued for ${String(recipients.length)} recipients.`,
  );
  return { sent: true };
}
