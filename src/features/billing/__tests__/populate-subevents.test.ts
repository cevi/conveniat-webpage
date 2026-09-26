/* eslint-disable @typescript-eslint/unbound-method */
jest.mock('@/features/registration_process/hitobito-api', () => ({
  HITOBITO_CONFIG: { baseUrl: 'http://mock', apiToken: 'mock' },
}));
jest.mock('@/features/billing/adapters/hitobito-service.adapter', () => ({}));
jest.mock('@/features/billing/adapters/payload-settings.adapter', () => ({}));

import type { HitobitoServicePort } from '@/features/billing/ports/hitobito-service.port';
import type { SettingsPort } from '@/features/billing/ports/settings.port';
import type { PopulateSubeventsProgress } from '@/features/billing/services/populate-subevents';
import { populateSubeventsUseCase } from '@/features/billing/services/populate-subevents';
import type { Hof } from '@/features/payload-cms/payload-types';

/** A stored Hof, with only what the merge looks at. */
const storedHof = (hof: Partial<Hof> & Pick<Hof, 'groupId'>): Hof =>
  ({ id: `hof-${hof.groupId}`, name: `Hof ${hof.groupId}`, events: [], ...hof }) as Hof;

// Typed rather than bare `jest.fn()`, so that reading an attribute off a recorded call is not
// an `any` access.
const logLevel = (): jest.Mock<void, [string, Record<string, unknown>?]> =>
  jest.fn<void, [string, Record<string, unknown>?]>();

describe('populateSubeventsUseCase', () => {
  let mockHitobitoService: jest.Mocked<HitobitoServicePort>;
  let mockSettingsRepo: jest.Mocked<SettingsPort>;
  const mockLogger = {
    debug: logLevel(),
    info: logLevel(),
    warn: logLevel(),
    error: logLevel(),
  };

  beforeEach(() => {
    mockHitobitoService = {
      fetchParticipations: jest.fn(),
      fetchParticipationAnswers: jest.fn(),
      fetchSubgroupLinks: jest.fn(),
      fetchEventsForGroup: jest.fn(),
      fetchPersonDetails: jest.fn(),
      fetchAddressManagerEmails: jest.fn().mockResolvedValue([]),
      updateParticipationAnswer: jest.fn(),
    };

    mockSettingsRepo = {
      getBillSettings: jest.fn(),
      getRegistrationManagement: jest.fn(),
      getHoefe: jest.fn().mockResolvedValue([]),
      getHofEvents: jest.fn(),
      upsertHoefe: jest.fn(),
      updateNextReferenceNumber: jest.fn(),
    };

    jest.clearAllMocks();
  });

  it('reports progress per batch and streams the newly discovered events', async () => {
    // Four subgroups: with a concurrency limit of 3 that is two batches.
    mockHitobitoService.fetchSubgroupLinks.mockResolvedValue(['1', '2', '3', '4']);
    const eventsPerGroup: Record<string, Array<{ id: string; name: string }>> = {
      '2': [
        { id: 'e-2', name: 'Hauptlager conveniat27 Bern' },
        { id: 'e-x', name: 'Sommerlager 2027' },
      ],
      '4': [{ id: 'e-4', name: 'conveniat27 Zürich' }],
    };
    mockHitobitoService.fetchEventsForGroup.mockImplementation((groupId: string) =>
      Promise.resolve(eventsPerGroup[groupId] ?? []),
    );

    const progress: PopulateSubeventsProgress[] = [];
    const result = await populateSubeventsUseCase(
      mockHitobitoService,
      mockSettingsRepo,
      mockLogger,
      (update) => {
        progress.push(update);
      },
    );

    // One initial frame plus one per batch.
    expect(progress.map((p) => p.processedGroups)).toEqual([0, 3, 4]);
    expect(progress.every((p) => p.totalGroups === 4)).toBe(true);

    // Non-matching events are filtered out, and each frame only carries its own batch.
    expect(progress[1]?.foundEvents.map((event) => event.eventName)).toEqual([
      'Hauptlager conveniat27 Bern',
    ]);
    expect(progress[2]?.foundEvents.map((event) => event.eventName)).toEqual([
      'conveniat27 Zürich',
    ]);

    expect(result.count).toBe(2);
    expect(result.newEvents).toEqual([
      {
        eventId: 'e-2',
        eventName: 'Hauptlager conveniat27 Bern',
        groupId: '2',
        addressManagerEmails: '',
      },
      {
        eventId: 'e-4',
        eventName: 'conveniat27 Zürich',
        groupId: '4',
        addressManagerEmails: '',
      },
    ]);

    // Only the groups that actually run a matching event are asked for their managers,
    // and each of them exactly once.
    expect(mockHitobitoService.fetchAddressManagerEmails.mock.calls.flat()).toEqual(['2', '4']);
  });

  it('creates one Hof per group, named after its first event', async () => {
    mockHitobitoService.fetchSubgroupLinks.mockResolvedValue(['2']);
    mockHitobitoService.fetchEventsForGroup.mockResolvedValue([
      { id: 'e-2', name: 'Hauptlager conveniat27 - Altstetten & Albisrieden' },
      { id: 'e-3', name: 'conveniat27 Altstetten Leitende' },
    ]);
    mockHitobitoService.fetchAddressManagerEmails.mockResolvedValue(['av@example.com']);

    await populateSubeventsUseCase(mockHitobitoService, mockSettingsRepo, mockLogger);

    expect(mockSettingsRepo.upsertHoefe).toHaveBeenCalledWith([
      {
        groupId: '2',
        name: 'Altstetten & Albisrieden',
        events: [
          { eventId: 'e-3', eventName: 'conveniat27 Altstetten Leitende' },
          { eventId: 'e-2', eventName: 'Hauptlager conveniat27 - Altstetten & Albisrieden' },
        ],
        addressManagerEmails: 'av@example.com',
      },
    ]);
  });

  it('keeps existing Höfe and only counts genuinely new events', async () => {
    mockSettingsRepo.getHoefe.mockResolvedValue([
      storedHof({
        groupId: '1',
        name: 'Hof Basel',
        events: [{ eventId: 'e-1', eventName: 'conveniat27 Basel' }],
        addressManagerEmails: 'alt@example.com',
        reminderRecipientsOverride: 'chef@example.com',
      }),
    ]);

    mockHitobitoService.fetchSubgroupLinks.mockResolvedValue(['1', '2']);
    mockHitobitoService.fetchEventsForGroup.mockImplementation((groupId: string) =>
      Promise.resolve(
        groupId === '1'
          ? [{ id: 'e-1', name: 'conveniat27 Basel' }]
          : [{ id: 'e-2', name: 'conveniat27 Chur' }],
      ),
    );
    mockHitobitoService.fetchAddressManagerEmails.mockImplementation((groupId: string) =>
      Promise.resolve(groupId === '1' ? ['neu@example.com', 'zweite@example.com'] : []),
    );

    const result = await populateSubeventsUseCase(
      mockHitobitoService,
      mockSettingsRepo,
      mockLogger,
    );

    expect(result.count).toBe(1);
    expect(result.newEvents).toEqual([
      { eventId: 'e-2', eventName: 'conveniat27 Chur', groupId: '2', addressManagerEmails: '' },
    ]);
    // The flat list the button shows carries the override an editor set on the Hof.
    expect(result.allEvents).toEqual([
      {
        eventId: 'e-1',
        eventName: 'conveniat27 Basel',
        groupId: '1',
        addressManagerEmails: 'neu@example.com, zweite@example.com',
        reminderRecipientsOverride: 'chef@example.com',
      },
      { eventId: 'e-2', eventName: 'conveniat27 Chur', groupId: '2' },
    ]);
    // Neither the name nor the override of a known Hof is part of what the sync writes.
    expect(mockSettingsRepo.upsertHoefe).toHaveBeenCalledWith([
      {
        groupId: '1',
        name: 'Hof Basel',
        events: [{ eventId: 'e-1', eventName: 'conveniat27 Basel' }],
        addressManagerEmails: 'neu@example.com, zweite@example.com',
      },
      {
        groupId: '2',
        name: 'Chur',
        events: [{ eventId: 'e-2', eventName: 'conveniat27 Chur' }],
        addressManagerEmails: '',
      },
    ]);
  });

  it('leaves a Hof the walk did not change unwritten', async () => {
    mockSettingsRepo.getHoefe.mockResolvedValue([
      storedHof({
        groupId: '1',
        events: [{ eventId: 'e-1', eventName: 'conveniat27 Basel' }],
        addressManagerEmails: 'av@example.com',
      }),
    ]);
    mockHitobitoService.fetchSubgroupLinks.mockResolvedValue(['1']);
    mockHitobitoService.fetchEventsForGroup.mockResolvedValue([
      { id: 'e-1', name: 'conveniat27 Basel' },
    ]);
    mockHitobitoService.fetchAddressManagerEmails.mockResolvedValue(['av@example.com']);

    await populateSubeventsUseCase(mockHitobitoService, mockSettingsRepo, mockLogger);

    expect(mockSettingsRepo.upsertHoefe).toHaveBeenCalledWith([]);
  });

  it('adopts the new name of an event and moves an event Cevi.DB now lists elsewhere', async () => {
    mockSettingsRepo.getHoefe.mockResolvedValue([
      storedHof({
        groupId: '1',
        name: 'Hof Seuzach',
        events: [
          { eventId: 'e-1', eventName: 'conveniat27 Seuzach' },
          { eventId: 'e-9', eventName: 'conveniat27 Seuzach Leitende' },
        ],
        reminderRecipientsOverride: 'chef@example.com',
      }),
    ]);

    mockHitobitoService.fetchSubgroupLinks.mockResolvedValue(['1', '7']);
    mockHitobitoService.fetchEventsForGroup.mockImplementation((groupId: string) =>
      Promise.resolve(
        groupId === '1'
          ? [{ id: 'e-9', name: 'Hauptlager conveniat27 Seuzach-Welsikon Leitende' }]
          : [{ id: 'e-1', name: 'Hauptlager conveniat27 Seuzach-Welsikon' }],
      ),
    );
    mockHitobitoService.fetchAddressManagerEmails.mockResolvedValue(['neu@example.com']);

    const result = await populateSubeventsUseCase(
      mockHitobitoService,
      mockSettingsRepo,
      mockLogger,
    );

    // Neither the rename nor the move is a new event, so neither is counted as one.
    expect(result.count).toBe(0);
    expect(result.allEvents).toEqual([
      {
        eventId: 'e-1',
        eventName: 'Hauptlager conveniat27 Seuzach-Welsikon',
        groupId: '7',
        addressManagerEmails: 'neu@example.com',
      },
      {
        eventId: 'e-9',
        eventName: 'Hauptlager conveniat27 Seuzach-Welsikon Leitende',
        groupId: '1',
        addressManagerEmails: 'neu@example.com',
        reminderRecipientsOverride: 'chef@example.com',
      },
    ]);
  });

  it('leaves the stored address managers alone when the Cevi.DB lookup fails', async () => {
    mockSettingsRepo.getHoefe.mockResolvedValue([
      storedHof({
        groupId: '1',
        events: [{ eventId: 'e-1', eventName: 'conveniat27 Basel' }],
        addressManagerEmails: 'bekannt@example.com',
      }),
    ]);

    mockHitobitoService.fetchSubgroupLinks.mockResolvedValue(['1']);
    mockHitobitoService.fetchEventsForGroup.mockResolvedValue([
      { id: 'e-1', name: 'conveniat27 Basel' },
      { id: 'e-2', name: 'conveniat27 Basel Leitende' },
    ]);
    mockHitobitoService.fetchAddressManagerEmails.mockRejectedValue(new Error('status 500'));

    const result = await populateSubeventsUseCase(
      mockHitobitoService,
      mockSettingsRepo,
      mockLogger,
    );

    // A failed lookup says nothing about who the managers are — emptying the list would
    // silently stop the reminders for this Hof.
    expect(result.allEvents.map((event) => event.addressManagerEmails)).toEqual([
      'bekannt@example.com',
      'bekannt@example.com',
    ]);
    const [writes] = mockSettingsRepo.upsertHoefe.mock.calls[0] ?? [];
    expect(writes?.[0]).not.toHaveProperty('addressManagerEmails');

    // The one line a human has to be able to find: which group was skipped, and why.
    const [warning, attributes] = mockLogger.warn.mock.calls[0] ?? [];
    expect(warning).toBe('Giving up on a Cevi.DB lookup');
    expect(attributes).toMatchObject({
      'billing.lookup': 'address managers',
      'billing.group_id': '1',
    });
    expect(attributes?.['error']).toBeInstanceOf(Error);
  });

  it('records how far the walk got after every batch', async () => {
    mockHitobitoService.fetchSubgroupLinks.mockResolvedValue(['1', '2', '3', '4']);
    mockHitobitoService.fetchEventsForGroup.mockResolvedValue([]);

    await populateSubeventsUseCase(mockHitobitoService, mockSettingsRepo, mockLogger);

    // A run cut off mid-walk — by the browser, or by the replica being replaced — leaves
    // these behind, which is how far it got. Without them it looks like it never started.
    const walked = mockLogger.debug.mock.calls.filter(
      ([message]) => message === 'Walked a batch of subgroups',
    );
    expect(walked.map(([, attributes]) => attributes?.['billing.processed_groups'])).toEqual([
      3, 4,
    ]);
    expect(walked.every(([, attributes]) => attributes?.['billing.total_groups'] === 4)).toBe(true);
  });

  it('still reports a total of zero subgroups without dividing by zero downstream', async () => {
    mockHitobitoService.fetchSubgroupLinks.mockResolvedValue([]);

    const progress: PopulateSubeventsProgress[] = [];
    const result = await populateSubeventsUseCase(
      mockHitobitoService,
      mockSettingsRepo,
      mockLogger,
      (update) => {
        progress.push(update);
      },
    );

    expect(progress).toEqual([{ processedGroups: 0, totalGroups: 0, foundEvents: [] }]);
    expect(result.count).toBe(0);
  });

  it('ignores Aufbau- and Abbaulager events and cleans them from the stored Höfe', async () => {
    mockSettingsRepo.getHoefe.mockResolvedValue([
      storedHof({
        groupId: '1',
        name: 'Hof Basel',
        events: [
          { eventId: 'e-existing-haupt', eventName: 'Hauptlager conveniat27 Basel' },
          { eventId: 'e-old-aufbau', eventName: 'Aufbaulager conveniat27 - Basel' },
          { eventId: 'e-old-abbau', eventName: 'Abbaulager conveniat27 - Basel' },
        ],
      }),
    ]);

    mockHitobitoService.fetchSubgroupLinks.mockResolvedValue(['2']);
    mockHitobitoService.fetchEventsForGroup.mockImplementation((groupId: string) =>
      Promise.resolve(
        groupId === '2'
          ? [
              { id: 'e-new-haupt', name: 'Hauptlager conveniat27 Bern' },
              { id: 'e-new-aufbau', name: 'Aufbaulager conveniat27 - Bern' },
              { id: 'e-new-abbau', name: 'Abbaulager conveniat27 - Bern' },
            ]
          : [],
      ),
    );

    const result = await populateSubeventsUseCase(
      mockHitobitoService,
      mockSettingsRepo,
      mockLogger,
    );

    expect(result.count).toBe(1);
    expect(result.newEvents).toEqual([
      {
        eventId: 'e-new-haupt',
        eventName: 'Hauptlager conveniat27 Bern',
        groupId: '2',
        addressManagerEmails: '',
      },
    ]);
    expect(result.allEvents).toEqual([
      { eventId: 'e-existing-haupt', eventName: 'Hauptlager conveniat27 Basel', groupId: '1' },
      { eventId: 'e-new-haupt', eventName: 'Hauptlager conveniat27 Bern', groupId: '2' },
    ]);
    expect(mockSettingsRepo.upsertHoefe).toHaveBeenCalledWith([
      {
        groupId: '1',
        name: 'Hof Basel',
        events: [{ eventId: 'e-existing-haupt', eventName: 'Hauptlager conveniat27 Basel' }],
      },
      {
        groupId: '2',
        name: 'Bern',
        events: [{ eventId: 'e-new-haupt', eventName: 'Hauptlager conveniat27 Bern' }],
        addressManagerEmails: '',
      },
    ]);
  });
});
