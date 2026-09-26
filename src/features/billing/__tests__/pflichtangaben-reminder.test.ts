/* eslint-disable unicorn/no-null */
jest.mock('@/features/registration_process/hitobito-api', () => ({
  HITOBITO_CONFIG: { baseUrl: 'https://db.cevi.test', apiToken: 'mock' },
}));
jest.mock('@/features/payload-cms/payload-cms/utils/send-tracked-email', () => ({
  sendTrackedEmail: jest.fn(),
}));
// The real adapter reaches Redis, which reads the validated environment at module load.
jest.mock('@/features/billing/adapters/redis-run-lock.adapter', () => ({
  RedisRunLockAdapter: jest.fn().mockImplementation(() => ({ acquire: mockAcquire })),
}));

import {
  applyReminderPlaceholders,
  groupRemindersByEvent,
  isReminderDue,
  renderReminderText,
  selectNotRecentlyReminded,
  selectOverdueParticipants,
  sendPflichtangabenReminders,
} from '@/features/billing/services/pflichtangaben-reminder';
import { sendTrackedEmail } from '@/features/payload-cms/payload-cms/utils/send-tracked-email';
import type { BillParticipant } from '@/features/payload-cms/payload-types';
import type { Payload } from 'payload';

const mockRelease = jest.fn();
const mockAcquire = jest.fn();

const NOW = new Date('2026-08-31T09:00:00');

const daysAgo = (days: number): string => new Date(NOW.getTime() - days * 86_400_000).toISOString();

const participant = (overrides: Partial<BillParticipant> = {}): BillParticipant =>
  ({
    id: 'p1',
    status: 'pflichtangaben_missing',
    fullName: 'Max Mustermann',
    nickname: 'Muster',
    eventId: '11',
    eventName: 'Hof Züri 11',
    groupId: '22',
    participationUuid: 'uuid-1',
    firstSyncDate: daysAgo(10),
    missingStammdaten: ['AHV-Nummer', 'Strasse'],
    missingAnmeldeangaben: ['Anmeldestatus'],
    ...overrides,
  }) as unknown as BillParticipant;

describe('selectOverdueParticipants', () => {
  it('keeps a registration that has been incomplete for the configured number of days', () => {
    // The boundary itself counts: seven days after the first sync is "seven days missing".
    const rows = selectOverdueParticipants(
      [
        participant({ id: 'old', firstSyncDate: daysAgo(7) }),
        participant({ id: 'fresh', firstSyncDate: daysAgo(6) }),
      ],
      NOW,
      7,
    );
    expect(rows.map((row) => row.id)).toEqual(['old']);
  });

  it('leaves out registrations that are complete or have no usable first sync date', () => {
    const rows = selectOverdueParticipants(
      [
        participant({ id: 'billed', status: 'bill_created' }),
        participant({ id: 'undated', firstSyncDate: null }),
        participant({ id: 'garbage', firstSyncDate: 'irgendwann' }),
      ],
      NOW,
      7,
    );
    expect(rows).toEqual([]);
  });
});

describe('groupRemindersByEvent', () => {
  const events = [
    { eventId: '11', eventName: 'Hof Züri 11', addressManagerEmails: 'av@zueri11.ch' },
    {
      eventId: '12',
      eventName: 'Hof Schlatt',
      addressManagerEmails: 'av@schlatt.ch',
      reminderRecipientsOverride: ' kasse@schlatt.ch , praesi@schlatt.ch ',
    },
  ];

  it('makes one mail per Hof with that Hof’s registrations', () => {
    const groups = groupRemindersByEvent(
      [
        participant({ id: 'a', eventId: '11' }),
        participant({ id: 'b', eventId: '12' }),
        participant({ id: 'c', eventId: '11' }),
      ],
      events,
    );

    expect(groups.map((group) => [group.eventId, group.participants.map((row) => row.id)])).toEqual(
      [
        ['11', ['a', 'c']],
        ['12', ['b']],
      ],
    );
  });

  it('lets the override replace the synced address managers', () => {
    const groups = groupRemindersByEvent([participant({ eventId: '12' })], events);
    expect(groups[0]?.recipients).toEqual(['kasse@schlatt.ch', 'praesi@schlatt.ch']);
  });

  it('still returns a Hof nobody can be told about, so the caller can report it', () => {
    const groups = groupRemindersByEvent(
      [participant({ eventId: '99', eventName: 'Hof Ohne Einstellungen' })],
      events,
    );
    expect(groups[0]?.recipients).toEqual([]);
    // The name falls back to the one on the registration, so the error can name the Hof.
    expect(groups[0]?.eventName).toBe('Hof Ohne Einstellungen');
  });
});

describe('renderReminderText', () => {
  it('names every missing field and links the participation in the Cevi.DB', () => {
    const text = renderReminderText({
      eventName: 'Hof Züri 11',
      participants: [participant()],
      intro: 'Hallo',
      hitobitoBaseUrl: 'https://db.cevi.test',
    });

    expect(text).toContain('Max Mustermann (Muster)');
    expect(text).toContain('https://db.cevi.test/groups/22/events/11/participations/uuid-1');
    expect(text).toContain('Fehlende Stammdaten: AHV-Nummer, Strasse');
    expect(text).toContain('Fehlende Anmeldeangaben: Anmeldestatus');
  });

  it('omits a list that has nothing in it rather than printing an empty label', () => {
    const text = renderReminderText({
      eventName: 'Hof Züri 11',
      // A sync that found nothing writes `[]`; an older row may have nothing at all.
      participants: [participant({ missingStammdaten: [], missingAnmeldeangaben: null })],
      intro: 'Hallo',
      hitobitoBaseUrl: 'https://db.cevi.test',
    });

    expect(text).not.toContain('Fehlende Stammdaten');
    expect(text).not.toContain('Fehlende Anmeldeangaben');
  });
});

describe('applyReminderPlaceholders', () => {
  it('fills the figures an operator can reference', () => {
    expect(
      applyReminderPlaceholders('{{count}} in {{eventName}}', { eventName: 'Hof X', count: 3 }),
    ).toBe('3 in Hof X');
  });
});

describe('isReminderDue', () => {
  // NOW is a Monday at 09:00.
  const config = { enabled: true, weekday: '1', hour: 9 };

  it('is due in the configured slot', () => {
    expect(isReminderDue(config, NOW).due).toBe(true);
  });

  it('is not due when switched off, or outside the configured slot', () => {
    expect(isReminderDue({ ...config, enabled: false }, NOW).due).toBe(false);
    expect(isReminderDue({ ...config, weekday: '3' }, NOW).due).toBe(false);
    expect(isReminderDue({ ...config, hour: 8 }, NOW).due).toBe(false);
  });

  it('refuses a second send in the same week', () => {
    // Both replicas reach the hourly task, so the timestamp is what stops a double send.
    expect(isReminderDue({ ...config, lastSentAt: daysAgo(1) }, NOW).due).toBe(false);
  });
});

interface MockedPayload {
  payload: Payload;
  update: jest.Mock;
  updateGlobal: jest.Mock;
  findByID: jest.Mock;
  warn: jest.Mock;
  info: jest.Mock;
}

/** The Höfe the reminders read their recipients from; Hof Schlatt has none. */
const HOEFE = [
  {
    id: 'hof-zueri',
    name: 'Hof Züri 11',
    groupId: '22',
    events: [{ eventId: '11', eventName: 'Hof Züri 11' }],
    addressManagerEmails: 'av@zueri11.ch',
  },
  {
    id: 'hof-schlatt',
    name: 'Hof Schlatt',
    groupId: '23',
    events: [{ eventId: '12', eventName: 'Hof Schlatt' }],
  },
];

const mockPayload = (
  settings: Record<string, unknown>,
  participants: BillParticipant[],
  /** What a re-read of a participant returns, when the test cares. */
  fresh?: Record<string, unknown>,
): MockedPayload => {
  const update = jest.fn().mockResolvedValue({});
  const updateGlobal = jest.fn().mockResolvedValue({});
  const findByID = jest
    .fn()
    .mockImplementation(({ id }: { id: string }) =>
      Promise.resolve(fresh ?? participants.find((row) => row.id === id) ?? {}),
    );
  const warn = jest.fn();
  const info = jest.fn();
  const payload = {
    findGlobal: jest.fn().mockResolvedValue(settings),
    find: jest
      .fn()
      .mockImplementation(({ collection }: { collection: string }) =>
        Promise.resolve({ docs: collection === 'hoefe' ? HOEFE : participants }),
      ),
    findByID,
    update,
    updateGlobal,
    logger: { info, debug: jest.fn(), error: jest.fn(), warn },
  } as unknown as Payload;
  return { payload, update, updateGlobal, findByID, warn, info };
};

/** A registration whose audit trail says it was reminded `days` ago. */
const reminded = (days: number, id = 'p1'): BillParticipant =>
  participant({
    id,
    syncHistory: [{ date: daysAgo(days), action: 'pflichtangaben_reminder_sent' }],
  });

describe('selectNotRecentlyReminded', () => {
  it('keeps out a registration reminded within the last six days', () => {
    // A failed mail leaves `lastSentAt` untouched, so the next hourly tick retries the
    // whole run — the Höfe that were reached must not be chased again.
    expect(selectNotRecentlyReminded([reminded(2)], NOW)).toEqual([]);
  });

  it('chases again once the reminder is older than the window', () => {
    expect(selectNotRecentlyReminded([reminded(7)], NOW)).toHaveLength(1);
  });

  it('ignores history it cannot read and other actions', () => {
    const rows = [
      participant({ id: 'none', syncHistory: null }),
      participant({
        id: 'other',
        syncHistory: [{ date: daysAgo(1), action: 'synced' }],
      }),
      participant({
        id: 'undated',
        syncHistory: [{ action: 'pflichtangaben_reminder_sent' }],
      }),
    ];
    expect(selectNotRecentlyReminded(rows, NOW).map((row) => row.id)).toEqual([
      'none',
      'other',
      'undated',
    ]);
  });
});

describe('sendPflichtangabenReminders', () => {
  beforeEach(() => {
    (sendTrackedEmail as jest.Mock).mockReset();
    (sendTrackedEmail as jest.Mock).mockResolvedValue({ success: true, outgoingEmailId: 'e1' });
    mockRelease.mockReset();
    mockAcquire.mockReset();
    mockAcquire.mockResolvedValue({ acquired: true, lock: { release: mockRelease } });
    // The service reads the clock itself, so the fixture dates have to mean what they say.
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] }).setSystemTime(NOW);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const settings = {
    pflichtangabenReminder: { enabled: true, minDaysMissing: 7 },
  };

  it('sends one mail per Hof, linked to every registration it covers', async () => {
    const { payload, update, updateGlobal } = mockPayload(settings, [
      participant({ id: 'a', eventId: '11' }),
      participant({ id: 'b', eventId: '11' }),
    ]);

    const summary = await sendPflichtangabenReminders(payload, { force: true });

    expect(summary).toMatchObject({ sent: true, mailCount: 1, participantCount: 2, errors: [] });
    expect(sendTrackedEmail).toHaveBeenCalledTimes(1);
    const [, options, , ids] = (sendTrackedEmail as jest.Mock).mock.calls[0] as [
      unknown,
      { to: string; subject: string; text: string },
      undefined,
      string[],
    ];
    expect(options.to).toBe('av@zueri11.ch');
    expect(options.subject).toContain('Hof Züri 11');
    expect(ids).toEqual(['a', 'b']);

    // The audit trail records the reminder; the status stays where the sync put it.
    const [[updated]] = update.mock.calls as [[{ data: { syncHistory: unknown[] } }]];
    const entry = updated.data;
    expect(entry.syncHistory).toEqual([
      expect.objectContaining({
        action: 'pflichtangaben_reminder_sent',
        recipients: ['av@zueri11.ch'],
      }),
    ]);
    expect(entry).not.toHaveProperty('status');
    expect(updateGlobal).toHaveBeenCalledTimes(1);
  });

  it('reports a Hof without recipients instead of dropping it silently', async () => {
    const { payload } = mockPayload(settings, [participant({ id: 'c', eventId: '12' })]);

    const summary = await sendPflichtangabenReminders(payload, { force: true });

    expect(sendTrackedEmail).not.toHaveBeenCalled();
    expect(summary.sent).toBe(false);
    expect(summary.errors[0]).toContain('Hof Schlatt');
    // The recipients are set on the Hof, so that is the page the operator is sent to.
    expect(summary.relatedDocuments).toEqual(['hoefe']);
  });

  it('skips the run outside the configured slot', async () => {
    const { payload } = mockPayload({ ...settings, pflichtangabenReminder: { enabled: false } }, [
      participant(),
    ]);

    const summary = await sendPflichtangabenReminders(payload);

    expect(summary.sent).toBe(false);
    expect(sendTrackedEmail).not.toHaveBeenCalled();
  });

  it('sends a single registration on demand without touching the weekly guard', async () => {
    // Younger than minDaysMissing: an operator asking for it has already decided.
    const { payload, updateGlobal } = mockPayload(settings, [
      participant({ id: 'a', eventId: '11', firstSyncDate: daysAgo(1) }),
    ]);

    const summary = await sendPflichtangabenReminders(payload, { force: true, participantId: 'a' });

    expect(summary).toMatchObject({ sent: true, mailCount: 1, participantCount: 1 });
    expect(updateGlobal).not.toHaveBeenCalled();
  });

  it('refuses a single send for a registration that is not missing anything', async () => {
    const { payload } = mockPayload(settings, [participant({ id: 'a', status: 'bill_created' })]);

    const summary = await sendPflichtangabenReminders(payload, { force: true, participantId: 'a' });

    expect(summary.sent).toBe(false);
    expect(summary.reason).toContain('keine Pflichtangaben');
    expect(sendTrackedEmail).not.toHaveBeenCalled();
  });

  it('appends to the history the participant has now, not the one the run started with', async () => {
    // A sync finishing while the mails go out writes its own entries; appending to the
    // snapshot this run loaded would drop them.
    const { payload, update } = mockPayload(
      settings,
      [participant({ id: 'a', eventId: '11', syncHistory: [] })],
      { syncHistory: [{ date: daysAgo(0), action: 'synced' }] },
    );

    await sendPflichtangabenReminders(payload, { force: true });

    const [[updated]] = update.mock.calls as [[{ data: { syncHistory: { action: string }[] } }]];
    expect(updated.data.syncHistory.map((entry) => entry.action)).toEqual([
      'synced',
      'pflichtangaben_reminder_sent',
    ]);
  });

  it('does not count a mail that the SMTP server refused', async () => {
    (sendTrackedEmail as jest.Mock).mockResolvedValue({
      success: false,
      outgoingEmailId: 'e1',
      error: 'Connection refused',
    });
    const { payload, update, updateGlobal, warn } = mockPayload(settings, [
      participant({ id: 'a', eventId: '11' }),
    ]);

    const summary = await sendPflichtangabenReminders(payload, { force: true });

    expect(summary).toMatchObject({ sent: false, mailCount: 0, participantCount: 0 });
    expect(summary.errors[0]).toContain('Hof Züri 11');
    expect(summary.errors[0]).toContain('Connection refused');
    expect(update).not.toHaveBeenCalled();
    // Left where it was, so the next hourly tick retries this week.
    expect(updateGlobal).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
  });

  it('advances the weekly guard when every Hof was reached', async () => {
    const { payload, updateGlobal } = mockPayload(settings, [
      participant({ id: 'a', eventId: '11' }),
    ]);

    await sendPflichtangabenReminders(payload, { force: true });

    const [[written]] = updateGlobal.mock.calls as [
      [{ data: { pflichtangabenReminder: { lastSentAt: string } } }],
    ];
    expect(typeof written.data.pflichtangabenReminder.lastSentAt).toBe('string');
  });

  it('leaves out a Hof that was already reminded this week on a retry', async () => {
    const { payload } = mockPayload(settings, [
      participant({
        id: 'a',
        eventId: '11',
        syncHistory: [{ date: daysAgo(1), action: 'pflichtangaben_reminder_sent' }],
      }),
    ]);

    const summary = await sendPflichtangabenReminders(payload, { force: true });

    expect(sendTrackedEmail).not.toHaveBeenCalled();
    expect(summary.mailCount).toBe(0);
  });

  it('still sends a manual reminder for a registration reminded yesterday', async () => {
    const { payload } = mockPayload(settings, [
      participant({
        id: 'a',
        eventId: '11',
        syncHistory: [{ date: daysAgo(1), action: 'pflichtangaben_reminder_sent' }],
      }),
    ]);

    const summary = await sendPflichtangabenReminders(payload, { force: true, participantId: 'a' });

    expect(summary).toMatchObject({ sent: true, mailCount: 1 });
  });

  it('reports the same job running on the other worker as a duplicate, not a conflict', async () => {
    mockAcquire.mockResolvedValue({ acquired: false, heldBy: 'job:4711' });
    const { payload, info } = mockPayload(settings, [participant({ id: 'a', eventId: '11' })]);

    const summary = await sendPflichtangabenReminders(payload, {
      force: true,
      runOwner: 'job:4711',
    });

    expect(summary).toMatchObject({ sent: false, duplicate: true, mailCount: 0, errors: [] });
    expect(sendTrackedEmail).not.toHaveBeenCalled();
    expect(info).toHaveBeenCalled();
  });

  it('refuses to start while another run holds the lock', async () => {
    mockAcquire.mockResolvedValue({ acquired: false, heldBy: 'job:4712' });
    const { payload, warn } = mockPayload(settings, [participant({ id: 'a', eventId: '11' })]);

    const summary = await sendPflichtangabenReminders(payload, {
      force: true,
      runOwner: 'job:4711',
    });

    expect(summary.sent).toBe(false);
    expect(summary.duplicate).toBeUndefined();
    expect(summary.errors).toEqual(['Es läuft bereits ein Erinnerungsversand.']);
    expect(sendTrackedEmail).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
  });

  it('releases the lock even when the run throws', async () => {
    const { payload } = mockPayload(settings, [participant({ id: 'a', eventId: '11' })]);
    (payload.find as jest.Mock).mockRejectedValue(new Error('Datenbank weg'));

    await expect(sendPflichtangabenReminders(payload, { force: true })).rejects.toThrow(
      'Datenbank weg',
    );
    expect(mockRelease).toHaveBeenCalledTimes(1);
  });
});
