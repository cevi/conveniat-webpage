import {
  applyReportPlaceholders,
  isReportDue,
  parseRecipients,
} from '@/features/billing/services/send-weekly-report';
import { buildWeeklyReport, shortenEventName } from '@/features/billing/services/weekly-report';
import type { BillParticipant } from '@/features/payload-cms/payload-types';

const NOW = new Date('2026-08-31T09:00:00');

const participant = (overrides: Partial<BillParticipant>): BillParticipant =>
  ({
    id: 'p1',
    status: 'new',
    eventName: 'Hauptlager conveniat27 - Züri 11',
    fullName: 'Max Mustermann',
    // A healthy registration by default, so each test below states the one thing it is
    // actually about.
    email: 'max@example.ch',
    lastSyncDate: NOW.toISOString(),
    ...overrides,
  }) as unknown as BillParticipant;

describe('shortenEventName', () => {
  it('drops the prefix every event shares', () => {
    expect(shortenEventName('Hauptlager conveniat27 - Züri 11')).toBe('Züri 11');
  });

  it('leaves an event that does not follow the pattern alone', () => {
    // Truncating on a guess would silently mislabel a whole row of the report.
    expect(shortenEventName('Sommerlager Oberi')).toBe('Sommerlager Oberi');
  });

  it('names the missing case rather than showing an empty row', () => {
    const noEventName: string | undefined = undefined;
    expect(shortenEventName(noEventName)).toBe('Ohne Anlass');
    expect(shortenEventName('  ')).toBe('Ohne Anlass');
  });
});

describe('buildWeeklyReport', () => {
  it('counts each Abteilung separately, biggest first', () => {
    const report = buildWeeklyReport(
      [
        participant({ eventName: 'Hauptlager conveniat27 - Schlatt' }),
        participant({ eventName: 'Hauptlager conveniat27 - Züri 11' }),
        participant({ eventName: 'Hauptlager conveniat27 - Züri 11' }),
      ],
      NOW,
    );

    expect(report.abteilungen.map((row) => [row.name, row.total])).toEqual([
      ['Züri 11', 2],
      ['Schlatt', 1],
    ]);
    expect(report.totals.participants).toBe(3);
  });

  it('splits a registration into exactly one of billed, pending or blocked', () => {
    const report = buildWeeklyReport(
      [
        participant({ status: 'bill_sent' }),
        participant({ status: 'bill_created' }),
        participant({ status: 'new' }),
        participant({ status: 'pflichtangaben_missing' }),
      ],
      NOW,
    );

    const row = report.abteilungen[0];
    expect(row?.billed).toBe(2);
    expect(row?.sent).toBe(1);
    expect(row?.pending).toBe(1);
    expect(row?.blocked).toBe(1);
    // Every registration is accounted for exactly once.
    expect((row?.billed ?? 0) + (row?.pending ?? 0) + (row?.blocked ?? 0)).toBe(row?.total);
  });

  it('keeps a removed registration out of the Anmeldestand', () => {
    const report = buildWeeklyReport(
      [participant({ status: 'new' }), participant({ status: 'removed' })],
      NOW,
    );
    expect(report.totals.participants).toBe(1);
  });

  it('flags someone who dropped out after their bill went out', () => {
    const report = buildWeeklyReport(
      [participant({ status: 'removed', invoiceNumber: '2026-0044' })],
      NOW,
    );
    const billing = report.problems.find((group) => group.title === 'Rechnungsstellung');
    expect(
      billing?.entries.find((entry) => entry.label === 'Nach Rechnungsstellung abgemeldet')?.count,
    ).toBe(1);
  });

  it('flags a bill that has sat unsent', () => {
    const stale = new Date(NOW.getTime() - 9 * 86_400_000).toISOString();
    const report = buildWeeklyReport(
      [participant({ status: 'bill_created', billCreatedDate: stale })],
      NOW,
    );
    const billing = report.problems.find((group) => group.title === 'Rechnungsstellung');
    expect(billing?.entries.some((entry) => entry.label.includes('nicht versendet'))).toBe(true);
  });

  it('ranks the missing registration answers by how often they are missing', () => {
    const report = buildWeeklyReport(
      [
        participant({ status: 'pflichtangaben_missing', missingAnmeldeangaben: ['AHV-Nummer'] }),
        participant({
          status: 'pflichtangaben_missing',
          missingAnmeldeangaben: ['AHV-Nummer', 'Essgewohnheit'],
        }),
      ],
      NOW,
    );
    const gaps = report.problems.find((group) => group.title === 'Unvollständige Anmeldungen');
    expect(gaps?.entries[0]).toEqual({ label: 'AHV-Nummer', count: 2 });
  });

  it('reports a stale sync as not ok', () => {
    const old = new Date(NOW.getTime() - 5 * 86_400_000).toISOString();
    const report = buildWeeklyReport([participant({ lastSyncDate: old })], NOW);
    expect(report.health.find((entry) => entry.label.includes('Abgleich'))?.ok).toBe(false);
  });

  it('says nothing is wrong when nothing is', () => {
    const report = buildWeeklyReport([participant({ status: 'bill_sent' })], NOW);
    expect(report.problems).toEqual([]);
  });
});

describe('isReportDue', () => {
  // NOW is a Monday at 09:00.
  const config = { enabled: true, weekday: '1', hour: 9 };

  it('is due in the configured slot', () => {
    expect(isReportDue(config, NOW).due).toBe(true);
  });

  it('is not due when switched off', () => {
    expect(isReportDue({ ...config, enabled: false }, NOW).due).toBe(false);
  });

  it('is not due on another weekday or another hour', () => {
    expect(isReportDue({ ...config, weekday: '3' }, NOW).due).toBe(false);
    expect(isReportDue({ ...config, hour: 8 }, NOW).due).toBe(false);
  });

  it('refuses a second send in the same week', () => {
    // The task wakes hourly and both replicas reach it, so the timestamp is what stops
    // the report going out twice.
    const yesterday = new Date(NOW.getTime() - 86_400_000).toISOString();
    expect(isReportDue({ ...config, lastSentAt: yesterday }, NOW).due).toBe(false);
  });

  it('allows the next week even when the last one ran slightly late', () => {
    const almostAWeek = new Date(NOW.getTime() - 6.5 * 86_400_000).toISOString();
    expect(isReportDue({ ...config, lastSentAt: almostAWeek }, NOW).due).toBe(true);
  });
});

describe('parseRecipients', () => {
  it('splits and trims the configured list', () => {
    expect(parseRecipients(' a@x.ch , b@x.ch ')).toEqual(['a@x.ch', 'b@x.ch']);
  });

  it('falls back to the next list when the first is empty', () => {
    expect(parseRecipients('  ', 'finance@x.ch')).toEqual(['finance@x.ch']);
    const unset: string | undefined = undefined;
    expect(parseRecipients(unset, unset)).toEqual([]);
  });
});

describe('applyReportPlaceholders', () => {
  it('fills the figures the operator can reference', () => {
    const report = buildWeeklyReport(
      [participant({ status: 'new' }), participant({ status: 'pflichtangaben_missing' })],
      NOW,
    );
    expect(applyReportPlaceholders('{{total}} / {{blocked}}', report)).toBe('2 / 1');
  });
});
