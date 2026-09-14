/* eslint-disable unicorn/no-null */
jest.mock('@/features/registration_process/hitobito-api', () => ({
  HITOBITO_CONFIG: { baseUrl: 'https://db.cevi.test', apiToken: 'mock' },
}));
jest.mock('@/features/payload-cms/payload-cms/utils/send-tracked-email', () => ({
  sendTrackedEmail: jest.fn(),
}));

import {
  applyReminderPlaceholders,
  groupRemindersByEvent,
  isReminderDue,
  renderReminderText,
  selectOverdueParticipants,
  sendPflichtangabenReminders,
} from '@/features/billing/services/pflichtangaben-reminder';
import { sendTrackedEmail } from '@/features/payload-cms/payload-cms/utils/send-tracked-email';
import type { BillParticipant } from '@/features/payload-cms/payload-types';
import type { Payload } from 'payload';

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
}

const mockPayload = (
  settings: Record<string, unknown>,
  participants: BillParticipant[],
): MockedPayload => {
  const update = jest.fn().mockResolvedValue({});
  const updateGlobal = jest.fn().mockResolvedValue({});
  const payload = {
    findGlobal: jest.fn().mockResolvedValue(settings),
    find: jest.fn().mockResolvedValue({ docs: participants }),
    update,
    updateGlobal,
    logger: { info: jest.fn(), debug: jest.fn(), error: jest.fn() },
  } as unknown as Payload;
  return { payload, update, updateGlobal };
};

describe('sendPflichtangabenReminders', () => {
  beforeEach(() => {
    (sendTrackedEmail as jest.Mock).mockReset();
    (sendTrackedEmail as jest.Mock).mockResolvedValue({});
  });

  const settings = {
    events: [
      { eventId: '11', eventName: 'Hof Züri 11', addressManagerEmails: 'av@zueri11.ch' },
      { eventId: '12', eventName: 'Hof Schlatt' },
    ],
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
    expect(summary.relatedDocuments).toEqual(['billSettings']);
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
});
