import { BILLED_STATUSES, NEEDS_MANUAL_REVIEW } from '@/features/billing/services/billing-status';
import type { BillParticipant } from '@/features/payload-cms/payload-types';

/**
 * The weekly registration report: how many people have signed up per Abteilung, and what
 * is standing in the way of billing them.
 *
 * The arithmetic lives here, free of PDFKit and Payload, so what the report *claims* can
 * be tested without rendering anything. `render-weekly-report` turns this into a PDF.
 */

/** Statuses that mean the registration is usable and simply not billed yet. */
const PENDING_STATUSES = ['new', 'updated', 're_added'] as const;

export interface AbteilungRow {
  /** The Abteilung, as it reads once the shared event prefix is dropped. */
  name: string;
  total: number;
  /** Registrations with a bill raised, whatever has happened to it since. */
  billed: number;
  /** Bills that have gone out by email. */
  sent: number;
  /** Usable registrations still waiting for a bill. */
  pending: number;
  /** Registrations that cannot be billed as they stand. */
  blocked: number;
}

export interface ProblemGroup {
  title: string;
  entries: { label: string; count: number }[];
}

export interface HealthEntry {
  label: string;
  value: string;
  ok: boolean;
}

export interface WeeklyReport {
  generatedAt: Date;
  totals: {
    participants: number;
    billed: number;
    sent: number;
    pending: number;
    blocked: number;
    /** Gross total of every raised bill, in CHF. */
    invoicedAmount: number;
  };
  abteilungen: AbteilungRow[];
  problems: ProblemGroup[];
  health: HealthEntry[];
  /** Registrations added since the previous report. */
  newSinceLastWeek: number;
}

/**
 * Every event is called `Hauptlager conveniat27 - <Abteilung>`, so the prefix is noise in
 * a report that is entirely about conveniat27. An event that does not follow the pattern
 * is left alone rather than truncated on a guess.
 */
export function shortenEventName(eventName: string | null | undefined): string {
  const name = (eventName ?? '').trim();
  if (name === '') return 'Ohne Anlass';
  const separator = name.indexOf(' - ');
  if (separator === -1) return name;
  const tail = name.slice(separator + 3).trim();
  return tail === '' ? name : tail;
}

const isBilled = (status: string): boolean =>
  (BILLED_STATUSES as readonly string[]).includes(status) || status === NEEDS_MANUAL_REVIEW;

const isPending = (status: string): boolean =>
  (PENDING_STATUSES as readonly string[]).includes(status);

/** Counts how often each entry of a list appears, biggest first. */
const tally = (values: string[]): { label: string; count: number }[] => {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'de'));
};

const asStringList = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];

const daysBetween = (from: Date, to: Date): number =>
  Math.floor((to.getTime() - from.getTime()) / 86_400_000);

const parseDate = (value: unknown): Date | undefined => {
  if (typeof value !== 'string' || value === '') return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

export interface BuildWeeklyReportOptions {
  /** How long a raised bill may sit unsent before the report calls it out. */
  unsentBillWarningDays?: number;
  /** How far back "new this week" reaches. */
  periodDays?: number;
}

/**
 * Builds the report from the participant records.
 *
 * Deliberately reads only what the sync and the bill run have already written: the report
 * is a view of the billing state, so it can never disagree with the list an operator is
 * looking at.
 */
export function buildWeeklyReport(
  participants: BillParticipant[],
  now: Date = new Date(),
  options: BuildWeeklyReportOptions = {},
): WeeklyReport {
  const unsentBillWarningDays = options.unsentBillWarningDays ?? 7;
  const periodDays = options.periodDays ?? 7;

  // Removed registrations are not an Anmeldestand, but a bill raised before someone
  // dropped out is a problem, so they are counted below rather than dropped here.
  const active = participants.filter((p) => p.status !== 'removed');

  const byAbteilung = new Map<string, AbteilungRow>();
  for (const participant of active) {
    const name = shortenEventName(participant.eventName);
    const row = byAbteilung.get(name) ?? {
      name,
      total: 0,
      billed: 0,
      sent: 0,
      pending: 0,
      blocked: 0,
    };
    row.total++;
    const status = participant.status;
    if (isBilled(status)) row.billed++;
    if (status === 'bill_sent' || status === 'reminder_sent') row.sent++;
    if (isPending(status)) row.pending++;
    if (!isBilled(status) && !isPending(status)) row.blocked++;
    byAbteilung.set(name, row);
  }

  const abteilungen = [...byAbteilung.values()].sort(
    (a, b) => b.total - a.total || a.name.localeCompare(b.name, 'de'),
  );

  // ── Problems ──────────────────────────────────────────────────────────────
  const missingStammdaten = active.flatMap((p) =>
    p.status === 'pflichtangaben_missing' ? asStringList(p.missingStammdaten) : [],
  );
  const missingAnmeldeangaben = active.flatMap((p) =>
    p.status === 'pflichtangaben_missing' || p.status === 'invalid_anmeldeangaben'
      ? asStringList(p.missingAnmeldeangaben)
      : [],
  );

  const registrationGaps: ProblemGroup = {
    title: 'Unvollständige Anmeldungen',
    entries: tally([...missingStammdaten, ...missingAnmeldeangaben]).slice(0, 10),
  };

  const unsentBills = active.filter((p) => {
    if (p.status !== 'bill_created') return false;
    const created = parseDate(p.billCreatedDate);
    return created !== undefined && daysBetween(created, now) >= unsentBillWarningDays;
  }).length;

  const removedAfterBilling = participants.filter(
    (p) => p.status === 'removed' && typeof p.invoiceNumber === 'string' && p.invoiceNumber !== '',
  ).length;

  const withoutInvoiceEmail = active.filter(
    (p) => isBilled(p.status) && (p.email ?? '').trim() === '',
  ).length;

  const billingAnomalies: ProblemGroup = {
    title: 'Rechnungsstellung',
    entries: [
      {
        label: 'Manuelle Prüfung nötig',
        count: active.filter((p) => p.status === NEEDS_MANUAL_REVIEW).length,
      },
      {
        label: `Rechnung seit >${String(unsentBillWarningDays)} Tagen nicht versendet`,
        count: unsentBills,
      },
      { label: 'Nach Rechnungsstellung abgemeldet', count: removedAfterBilling },
      { label: 'Keine Mailadresse für Rechnung hinterlegt', count: withoutInvoiceEmail },
    ].filter((entry) => entry.count > 0),
  };

  const blockedGroup: ProblemGroup = {
    title: 'Nicht verrechenbar',
    entries: [
      {
        label: 'Pflichtangaben fehlen',
        count: active.filter((p) => p.status === 'pflichtangaben_missing').length,
      },
      {
        label: 'Anmeldeangaben ungültig (z.B. Rolle nicht konfiguriert)',
        count: active.filter((p) => p.status === 'invalid_anmeldeangaben').length,
      },
    ].filter((entry) => entry.count > 0),
  };

  const problems = [blockedGroup, billingAnomalies, registrationGaps].filter(
    (group) => group.entries.length > 0,
  );

  // ── Health ────────────────────────────────────────────────────────────────
  const lastSync = active
    .map((p) => parseDate(p.lastSyncDate))
    .filter((date): date is Date => date !== undefined)
    .sort((a, b) => b.getTime() - a.getTime())[0];

  const syncAgeDays = lastSync === undefined ? undefined : daysBetween(lastSync, now);

  const health: HealthEntry[] = [
    {
      label: 'Letzter Cevi.DB-Abgleich',
      value:
        lastSync === undefined
          ? 'nie'
          : `${lastSync.toLocaleDateString('de-CH')} (${
              syncAgeDays === 0 ? 'heute' : `vor ${String(syncAgeDays)} Tagen`
            })`,
      // A sync that has not run for more than a day means the numbers below are stale.
      ok: syncAgeDays !== undefined && syncAgeDays <= 1,
    },
    {
      label: 'Anmeldungen insgesamt',
      value: String(active.length),
      ok: active.length > 0,
    },
  ];

  const newSinceLastWeek = active.filter((p) => {
    const first = parseDate(p.firstSyncDate);
    return first !== undefined && daysBetween(first, now) < periodDays;
  }).length;

  const invoicedAmount = active.reduce(
    (sum, p) => (isBilled(p.status) ? sum + (p.invoiceAmount ?? 0) : sum),
    0,
  );

  return {
    generatedAt: now,
    totals: {
      participants: active.length,
      billed: abteilungen.reduce((sum, row) => sum + row.billed, 0),
      sent: abteilungen.reduce((sum, row) => sum + row.sent, 0),
      pending: abteilungen.reduce((sum, row) => sum + row.pending, 0),
      blocked: abteilungen.reduce((sum, row) => sum + row.blocked, 0),
      invoicedAmount: Math.round(invoicedAmount * 100) / 100,
    },
    abteilungen,
    problems,
    health,
    newSinceLastWeek,
  };
}
