import {
  applyReportPlaceholders,
  isReportDue,
  parseRecipients,
  sendWeeklyReport,
} from '@/features/billing/services/send-weekly-report';
import { buildWeeklyReport, shortenEventName } from '@/features/billing/services/weekly-report';
import { buildWeeklyReportAttachment } from '@/features/billing/services/weekly-report-document';
import type { BillParticipant } from '@/features/payload-cms/payload-types';
import type { Payload } from 'payload';

const mockAcquire = jest.fn();
jest.mock('@/features/billing/adapters/redis-run-lock.adapter', () => ({
  RedisRunLockAdapter: jest.fn().mockImplementation(() => ({
    acquire: mockAcquire,
  })),
}));

jest.mock('@/features/billing/services/render-weekly-report', () => ({
  renderWeeklyReportPdf: jest.fn().mockResolvedValue(Buffer.from('pdf')),
}));

jest.mock('@/features/billing/services/finance-overview-export', () => ({
  buildFinanceOverviewRows: jest.fn().mockReturnValue([]),
  buildFinanceOverviewWorkbook: jest.fn().mockResolvedValue(Buffer.from('xlsx')),
}));

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

function createMockPayload(
  configOverrides: Record<string, unknown> = {},
  financeRecipients = 'finance@example.ch',
): {
  findGlobal: jest.Mock;
  find: jest.Mock;
  sendEmail: jest.Mock;
  updateGlobal: jest.Mock;
  logger: {
    info: jest.Mock;
    warn: jest.Mock;
    error: jest.Mock;
  };
} {
  return {
    findGlobal: jest.fn().mockResolvedValue({
      scheduledReport: {
        enabled: true,
        weekday: '1',
        hour: 9,
        recipients: 'lead@example.ch',
        ...configOverrides,
      },
      financeEmailRecipients: financeRecipients,
    }),
    find: jest.fn().mockResolvedValue({ docs: [] }),
    sendEmail: jest.fn().mockResolvedValue({}),
    updateGlobal: jest.fn().mockResolvedValue({}),
    logger: {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    },
  };
}

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

describe('buildWeeklyReportAttachment', () => {
  it('names the file after the day the report covers', async () => {
    const report = buildWeeklyReport([participant({})], NOW);
    const attachment = await buildWeeklyReportAttachment(report);

    // The same name the weekly mail attaches, so a downloaded report and a mailed one
    // are recognisably the same document.
    expect(attachment.filename).toBe('anmeldestand-2026-08-31.pdf');
    expect(attachment.content).toEqual(Buffer.from('pdf'));
  });
});

describe('sendWeeklyReport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('skips when report is not due', async () => {
    const mockPayload = createMockPayload({ enabled: false });
    const result = await sendWeeklyReport(mockPayload as unknown as Payload, { now: NOW });

    expect(result.sent).toBe(false);
    expect(result.reason).toContain('disabled');
    expect(mockPayload.sendEmail).not.toHaveBeenCalled();
    expect(mockAcquire).not.toHaveBeenCalled();
  });

  it('skips duplicate execution when run lock is held by another worker on same job', async () => {
    const mockPayload = createMockPayload();
    mockAcquire.mockResolvedValue({
      acquired: false,
      heldBy: 'job:123',
    });

    const result = await sendWeeklyReport(mockPayload as unknown as Payload, {
      now: NOW,
      runOwner: 'job:123',
    });

    expect(result.sent).toBe(false);
    expect(result.reason).toContain('another worker');
    expect(mockPayload.sendEmail).not.toHaveBeenCalled();
  });

  it('skips execution when run lock is held by another run', async () => {
    const mockPayload = createMockPayload();
    mockAcquire.mockResolvedValue({
      acquired: false,
      heldBy: 'job:other',
    });

    const result = await sendWeeklyReport(mockPayload as unknown as Payload, {
      now: NOW,
      runOwner: 'job:current',
    });

    expect(result.sent).toBe(false);
    expect(result.reason).toContain('already running');
    expect(mockPayload.sendEmail).not.toHaveBeenCalled();
  });

  it('skips execution and does not send email when acquiring run lock throws', async () => {
    const mockPayload = createMockPayload();
    mockAcquire.mockRejectedValue(new Error('Redis connection lost'));

    const result = await sendWeeklyReport(mockPayload as unknown as Payload, {
      now: NOW,
      runOwner: 'job:123',
    });

    expect(result.sent).toBe(false);
    expect(result.reason).toContain('Redis run lock');
    expect(mockPayload.sendEmail).not.toHaveBeenCalled();
    expect(mockPayload.logger.error).toHaveBeenCalled();
  });

  it('sends separate emails for general report and finance overview when both are configured', async () => {
    const mockPayload = createMockPayload();
    const mockRelease = jest.fn().mockResolvedValue(true);
    mockAcquire.mockResolvedValue({
      acquired: true,
      lock: { release: mockRelease },
    });

    const result = await sendWeeklyReport(mockPayload as unknown as Payload, {
      now: NOW,
      runOwner: 'job:123',
    });

    expect(result.sent).toBe(true);
    expect(mockPayload.sendEmail).toHaveBeenCalledTimes(2);

    interface SendEmailCall {
      to: string;
      subject: string;
      text: string;
      attachments: { filename: string; content: Buffer }[];
    }
    const emailCalls = mockPayload.sendEmail.mock.calls as unknown as [SendEmailCall][];
    const generalMail = emailCalls[0]?.[0];
    const financeMail = emailCalls[1]?.[0];

    // General mail: sent to lead, contains PDF only, NEVER contains Excel
    expect(generalMail?.to).toBe('lead@example.ch');
    expect(generalMail?.subject).toContain('Anmeldestand');
    expect(generalMail?.attachments.map((a) => a.filename)).toEqual([
      'anmeldestand-2026-08-31.pdf',
    ]);

    // Finance mail: sent to finance, contains both PDF and Excel
    expect(financeMail?.to).toBe('finance@example.ch');
    expect(financeMail?.subject).toContain('Rechnungsübersicht');
    expect(financeMail?.attachments.map((a) => a.filename)).toEqual([
      'anmeldestand-2026-08-31.pdf',
      'rechnungsuebersicht-2026-08-31.xlsx',
    ]);

    interface UpdateGlobalCall {
      slug: string;
      data: {
        scheduledReport: {
          lastSentAt: string;
        };
      };
    }
    const updateCalls = mockPayload.updateGlobal.mock.calls as unknown as [UpdateGlobalCall][];
    expect(updateCalls[0]?.[0].slug).toBe('bill-settings');
    expect(updateCalls[0]?.[0].data.scheduledReport.lastSentAt).toBe(NOW.toISOString());
    expect(mockRelease).toHaveBeenCalledTimes(1);
  });

  it('sends only general email without Excel when finance recipients are not configured', async () => {
    const mockPayload = createMockPayload({}, '');
    const mockRelease = jest.fn().mockResolvedValue(true);
    mockAcquire.mockResolvedValue({
      acquired: true,
      lock: { release: mockRelease },
    });

    const result = await sendWeeklyReport(mockPayload as unknown as Payload, {
      now: NOW,
      runOwner: 'job:123',
    });

    expect(result.sent).toBe(true);
    expect(mockPayload.sendEmail).toHaveBeenCalledTimes(1);
    interface SendEmailCall {
      to: string;
      attachments: { filename: string }[];
    }
    const emailCalls = mockPayload.sendEmail.mock.calls as unknown as [SendEmailCall][];
    expect(emailCalls[0]?.[0].to).toBe('lead@example.ch');
    expect(emailCalls[0]?.[0].attachments.map((a) => a.filename)).toEqual([
      'anmeldestand-2026-08-31.pdf',
    ]);
  });

  it('sends only finance email when general recipients are not configured', async () => {
    const mockPayload = createMockPayload({ recipients: '' }, 'finance@example.ch');
    const mockRelease = jest.fn().mockResolvedValue(true);
    mockAcquire.mockResolvedValue({
      acquired: true,
      lock: { release: mockRelease },
    });

    const result = await sendWeeklyReport(mockPayload as unknown as Payload, {
      now: NOW,
      runOwner: 'job:123',
    });

    expect(result.sent).toBe(true);
    expect(mockPayload.sendEmail).toHaveBeenCalledTimes(1);
    interface SendEmailCall {
      to: string;
      attachments: { filename: string }[];
    }
    const emailCalls = mockPayload.sendEmail.mock.calls as unknown as [SendEmailCall][];
    expect(emailCalls[0]?.[0].to).toBe('finance@example.ch');
    expect(emailCalls[0]?.[0].attachments.map((a) => a.filename)).toEqual([
      'anmeldestand-2026-08-31.pdf',
      'rechnungsuebersicht-2026-08-31.xlsx',
    ]);
  });

  it('returns sent false if no recipients are configured at all', async () => {
    const mockPayload = createMockPayload({ recipients: '' }, '');
    const result = await sendWeeklyReport(mockPayload as unknown as Payload, {
      now: NOW,
    });

    expect(result.sent).toBe(false);
    expect(result.reason).toContain('No recipients configured');
    expect(mockPayload.sendEmail).not.toHaveBeenCalled();
  });

  it('does not send finance email when attachExcel is false', async () => {
    const mockPayload = createMockPayload({ attachExcel: false });
    const mockRelease = jest.fn().mockResolvedValue(true);
    mockAcquire.mockResolvedValue({
      acquired: true,
      lock: { release: mockRelease },
    });

    const result = await sendWeeklyReport(mockPayload as unknown as Payload, {
      now: NOW,
      runOwner: 'job:123',
    });

    expect(result.sent).toBe(true);
    expect(mockPayload.sendEmail).toHaveBeenCalledTimes(1);
    interface SendEmailCall {
      to: string;
      attachments: { filename: string }[];
    }
    const emailCalls = mockPayload.sendEmail.mock.calls as unknown as [SendEmailCall][];
    expect(emailCalls[0]?.[0].to).toBe('lead@example.ch');
    expect(emailCalls[0]?.[0].attachments.map((a) => a.filename)).toEqual([
      'anmeldestand-2026-08-31.pdf',
    ]);
  });
});
