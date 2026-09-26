import {
  groupLegacyHofEvents,
  migrateLegacyHoefe,
} from '@/features/payload-cms/payload-cms/initialization/migrate-legacy-hoefe';
import type { Payload } from 'payload';

describe('groupLegacyHofEvents', () => {
  it('makes one Hof per group, named after its first event, with all its events', () => {
    const { hoefe, conflicts, skippedRows } = groupLegacyHofEvents([
      {
        eventId: '11',
        eventName: 'Hauptlager conveniat27 - Altstetten & Albisrieden',
        groupId: '22',
        addressManagerEmails: 'av@altstetten.ch',
      },
      { eventId: '13', eventName: 'conveniat27 Schlatt', groupId: '23' },
      {
        eventId: '12',
        eventName: 'Hauptlager conveniat27 - Altstetten Leitende',
        groupId: '22',
        addressManagerEmails: 'av@altstetten.ch',
        reminderRecipientsOverride: 'chef@altstetten.ch',
      },
    ]);

    expect(hoefe).toEqual([
      {
        name: 'Altstetten & Albisrieden',
        groupId: '22',
        events: [
          { eventId: '11', eventName: 'Hauptlager conveniat27 - Altstetten & Albisrieden' },
          { eventId: '12', eventName: 'Hauptlager conveniat27 - Altstetten Leitende' },
        ],
        addressManagerEmails: 'av@altstetten.ch',
        reminderRecipientsOverride: 'chef@altstetten.ch',
      },
      {
        name: 'Schlatt',
        groupId: '23',
        events: [{ eventId: '13', eventName: 'conveniat27 Schlatt' }],
      },
    ]);
    expect(conflicts).toEqual([]);
    expect(skippedRows).toBe(0);
  });

  it('keeps the first non-empty address of a group and reports the disagreement', () => {
    const { hoefe, conflicts } = groupLegacyHofEvents([
      { eventId: '11', eventName: 'conveniat27 Züri', groupId: '22', addressManagerEmails: '' },
      {
        eventId: '12',
        eventName: 'conveniat27 Züri Leitende',
        groupId: '22',
        addressManagerEmails: 'erste@example.com',
      },
      {
        eventId: '14',
        eventName: 'conveniat27 Züri Küche',
        groupId: '22',
        addressManagerEmails: 'zweite@example.com',
      },
    ]);

    expect(hoefe[0]?.addressManagerEmails).toBe('erste@example.com');
    expect(conflicts).toEqual([
      {
        groupId: '22',
        field: 'addressManagerEmails',
        values: ['erste@example.com', 'zweite@example.com'],
      },
    ]);
  });

  it('skips rows it cannot place and names a nameless event after its id', () => {
    const { hoefe, skippedRows } = groupLegacyHofEvents([
      // eslint-disable-next-line unicorn/no-null
      { eventId: '11', eventName: null, groupId: ' 22 ' },
      { eventId: '', eventName: 'conveniat27 Ohne Anlass', groupId: '22' },
      { eventId: '12', eventName: 'conveniat27 Ohne Gruppe' },
    ]);

    expect(hoefe).toEqual([
      { name: 'Hof 22', groupId: '22', events: [{ eventId: '11', eventName: '11' }] },
    ]);
    expect(skippedRows).toBe(2);
  });
});

describe('migrateLegacyHoefe', () => {
  const legacyEvents = [
    { eventId: '11', eventName: 'conveniat27 Züri', groupId: '22' },
    { eventId: '13', eventName: 'conveniat27 Schlatt', groupId: '23' },
  ];

  const mockPayload = (
    existingHoefe: number,
    events: unknown[] = legacyEvents,
  ): { payload: Payload; create: jest.Mock; updateGlobal: jest.Mock; info: jest.Mock } => {
    const create = jest.fn().mockResolvedValue({});
    const updateGlobal = jest.fn();
    const info = jest.fn();
    const payload = {
      count: jest.fn().mockResolvedValue({ totalDocs: existingHoefe }),
      findGlobal: jest.fn().mockResolvedValue({ events }),
      create,
      updateGlobal,
      logger: { info, warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
    } as unknown as Payload;
    return { payload, create, updateGlobal, info };
  };

  it('creates the Höfe from the legacy list and leaves the list alone', async () => {
    const { payload, create, updateGlobal, info } = mockPayload(0);

    await migrateLegacyHoefe(payload);

    expect(create.mock.calls.map(([options]) => (options as { data: unknown }).data)).toEqual([
      { name: 'Züri', groupId: '22', events: [{ eventId: '11', eventName: 'conveniat27 Züri' }] },
      {
        name: 'Schlatt',
        groupId: '23',
        events: [{ eventId: '13', eventName: 'conveniat27 Schlatt' }],
      },
    ]);
    expect(updateGlobal).not.toHaveBeenCalled();
    expect(info).toHaveBeenCalledTimes(1);
  });

  it('does nothing once a single Hof exists', async () => {
    const { payload, create } = mockPayload(1);

    await migrateLegacyHoefe(payload);

    expect(create).not.toHaveBeenCalled();
  });

  it('does nothing when there is no legacy list', async () => {
    const { payload, create, info } = mockPayload(0, []);

    await migrateLegacyHoefe(payload);

    expect(create).not.toHaveBeenCalled();
    expect(info).not.toHaveBeenCalled();
  });

  it('carries on past a Hof another replica created first', async () => {
    const { payload, create, info } = mockPayload(0);
    create.mockRejectedValueOnce(new Error('E11000 duplicate key error'));

    await migrateLegacyHoefe(payload);

    expect(create).toHaveBeenCalledTimes(2);
    expect(info).toHaveBeenCalledWith(
      expect.objectContaining({ created: 1, hoefe: 2 }),
      expect.any(String),
    );
  });
});
