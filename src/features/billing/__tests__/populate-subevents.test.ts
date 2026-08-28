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
import type { PopulatedSubevent } from '@/features/billing/types';
import type { BillSetting } from '@/features/payload-cms/payload-types';

const billSettingsWith = (events: PopulatedSubevent[]): BillSetting =>
  ({ events }) as unknown as BillSetting;

describe('populateSubeventsUseCase', () => {
  let mockHitobitoService: jest.Mocked<HitobitoServicePort>;
  let mockSettingsRepo: jest.Mocked<SettingsPort>;
  const mockLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };

  beforeEach(() => {
    mockHitobitoService = {
      fetchParticipations: jest.fn(),
      fetchParticipationAnswers: jest.fn(),
      fetchSubgroupLinks: jest.fn(),
      fetchEventsForGroup: jest.fn(),
      fetchPersonDetails: jest.fn(),
    };

    mockSettingsRepo = {
      getBillSettings: jest.fn().mockResolvedValue(billSettingsWith([])),
      getRegistrationManagement: jest.fn(),
      updateBillSettingsEvents: jest.fn(),
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
      { eventId: 'e-2', eventName: 'Hauptlager conveniat27 Bern', groupId: '2' },
      { eventId: 'e-4', eventName: 'conveniat27 Zürich', groupId: '4' },
    ]);
  });

  it('keeps existing events and only counts genuinely new ones', async () => {
    mockSettingsRepo.getBillSettings.mockResolvedValue(
      billSettingsWith([{ eventId: 'e-1', eventName: 'conveniat27 Basel', groupId: '1' }]),
    );

    mockHitobitoService.fetchSubgroupLinks.mockResolvedValue(['1', '2']);
    mockHitobitoService.fetchEventsForGroup.mockImplementation((groupId: string) =>
      Promise.resolve(
        groupId === '1'
          ? [{ id: 'e-1', name: 'conveniat27 Basel' }]
          : [{ id: 'e-2', name: 'conveniat27 Chur' }],
      ),
    );

    const result = await populateSubeventsUseCase(
      mockHitobitoService,
      mockSettingsRepo,
      mockLogger,
    );

    expect(result.count).toBe(1);
    expect(result.newEvents).toEqual([
      { eventId: 'e-2', eventName: 'conveniat27 Chur', groupId: '2' },
    ]);
    // The form adopts this list without a reload, so it must carry the pre-existing rows too.
    expect(result.allEvents).toEqual([
      { eventId: 'e-1', eventName: 'conveniat27 Basel', groupId: '1' },
      { eventId: 'e-2', eventName: 'conveniat27 Chur', groupId: '2' },
    ]);
    expect(mockSettingsRepo.updateBillSettingsEvents).toHaveBeenCalledWith([
      { eventId: 'e-1', eventName: 'conveniat27 Basel', groupId: '1' },
      { eventId: 'e-2', eventName: 'conveniat27 Chur', groupId: '2' },
    ]);
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
});
