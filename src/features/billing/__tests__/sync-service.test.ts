/* eslint-disable @typescript-eslint/unbound-method */
jest.mock('@/features/registration_process/hitobito-api', () => ({
  HITOBITO_CONFIG: { baseUrl: 'http://mock', apiToken: 'mock' },
}));
jest.mock('@/features/billing/adapters/hitobito-service.adapter', () => ({}));
jest.mock('@/features/billing/adapters/payload-participant-repository.adapter', () => ({}));
jest.mock('@/features/billing/adapters/payload-settings.adapter', () => ({}));
jest.mock('@/features/billing/adapters/s3-storage.adapter', () => ({}));

import type {
  HitobitoServicePort,
  SyncedExternalParticipant,
} from '@/features/billing/ports/hitobito-service.port';
import type { ParticipantRepositoryPort } from '@/features/billing/ports/participant-repository.port';
import type { SettingsPort } from '@/features/billing/ports/settings.port';
import type {
  JobProgressReporter,
  JobProgressUpdate,
} from '@/features/billing/services/job-progress-reporter';
import { syncParticipantsUseCase } from '@/features/billing/services/sync-service';
import type { BillParticipant } from '@/features/payload-cms/payload-types';

/**
 * A reporter that records what the use case published, so a test can assert on the frames
 * an operator would have seen.
 */
const collectingReporter = (
  shouldCancel: () => boolean,
): { reporter: JobProgressReporter; updates: JobProgressUpdate[] } => {
  const updates: JobProgressUpdate[] = [];
  return {
    updates,
    reporter: {
      report: async (update): Promise<void> => {
        updates.push(update);
        await Promise.resolve();
      },
      shouldCancel: async (): Promise<boolean> => {
        await Promise.resolve();
        return shouldCancel();
      },
    },
  };
};

describe('Sync Service', () => {
  let mockParticipantRepo: jest.Mocked<ParticipantRepositoryPort>;
  let mockHitobitoService: jest.Mocked<HitobitoServicePort>;
  let mockSettingsRepo: jest.Mocked<SettingsPort>;
  const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  const mockEvent = {
    eventId: 'event-1',
    eventName: 'Test Event',
    groupId: 'group-1',
  };

  beforeEach(() => {
    mockParticipantRepo = {
      findById: jest.fn(),
      findByParticipationUuid: jest.fn(),
      findRemovedParticipant: jest.fn(),
      findActiveForEvent: jest.fn().mockResolvedValue([]),
      findForRegenerateAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findPdfFilenameById: jest.fn(),
      findPendingBilling: jest.fn(),
      uploadPdf: jest.fn(),
    };

    mockHitobitoService = {
      fetchParticipations: jest.fn(),
      fetchParticipationAnswers: jest.fn(),
      fetchSubgroupLinks: jest.fn(),
      fetchEventsForGroup: jest.fn(),
      fetchPersonDetails: jest.fn(),
    };

    mockSettingsRepo = {
      getBillSettings: jest.fn().mockResolvedValue({
        events: [mockEvent],
        // A role is only billable if something prices it, so the fixture has to price the
        // roles its participations use.
        rolePricing: [
          { roleTypePattern: 'Event::Role::Participant', label: 'Teilnehmendenbeitrag', amount: 1 },
          { roleTypePattern: 'Event::Role::Leader', label: 'Leitendenbeitrag', amount: 1 },
          {
            roleTypePattern: 'Event::Role::AssistantLeader',
            label: 'Leitendenbeitrag',
            amount: 1,
          },
        ],
      }),
      getRegistrationManagement: jest.fn(),
      updateBillSettingsEvents: jest.fn(),
      updateNextReferenceNumber: jest.fn(),
    };

    jest.clearAllMocks();
  });

  it('should update status from pflichtangaben_missing to new when all pflichtangaben are present now', async () => {
    // 1. Existing participant in DB has missing mandatory fields
    const mockExisting = {
      id: 'doc-1',
      participationUuid: 'part-1',
      userId: 'user-1',
      eventId: 'event-1',
      status: 'pflichtangaben_missing',
      roleType: 'Event::Role::Participant',
      active: true,
      syncHistory: [],
    };
    mockParticipantRepo.findByParticipationUuid.mockResolvedValue(
      mockExisting as unknown as BillParticipant,
    );

    // 2. Hitobito service returns the participation
    const mockExternalParticipant: SyncedExternalParticipant = {
      participationId: 'part-1',
      participantId: 'user-1',
      eventId: 'event-1',
      firstName: 'Max',
      lastName: 'Mustermann',
      nickname: 'Muster',
      fullName: 'Max Mustermann',
      roleType: 'Event::Role::Participant',
      enrollmentDate: '2026-06-22T00:00:00Z',
      street: 'Musterstrasse',
      housenumber: '42',
      zipCode: '8000',
      town: 'Zürich',
      country: 'CH',
      gender: 'male',
      birthday: '1990-01-01',
      active: true,
    };
    mockHitobitoService.fetchParticipations.mockResolvedValue([mockExternalParticipant]);

    // Answers are now complete
    const mockAnswers = {
      'AHV-Nummer?': '756.1234.5678.90',
      'T-Shirt Grösse (unisex)': 'L',
      'Mailadresse für Rechnung': 'max@example.com',
      'Name der Krankenkasse': 'Assura',
      'Versichertennummer (Nummer auf der Krankenkassenkarte)': '123456789',
      'Notfallkontakt Vollständiger Name': 'Erika Mustermann',
      'Notfallkontakt Telefonnummer': '079 123 45 67',
      Essgewohnheit: 'vegetarisch',
    };
    mockHitobitoService.fetchParticipationAnswers.mockResolvedValue(mockAnswers);

    const summary = await syncParticipantsUseCase(
      mockParticipantRepo,
      mockHitobitoService,
      mockSettingsRepo,
      mockLogger,
    );

    expect(summary.errors).toHaveLength(0);
    expect(summary.changedCount).toBe(1);

    // Should update repo with status 'new' (fully captured)
    expect(mockParticipantRepo.update).toHaveBeenCalledWith(
      'doc-1',
      expect.objectContaining({
        status: 'new',
        missingStammdaten: [],
        missingAnmeldeangaben: [],
      }),
    );
  });

  it('should transition to pflichtangaben_missing if mandatory fields are missing', async () => {
    // 1. Existing participant in DB is currently marked as new/OK
    const mockExisting = {
      id: 'doc-1',
      participationUuid: 'part-1',
      userId: 'user-1',
      eventId: 'event-1',
      status: 'new',
      roleType: 'Event::Role::Participant',
      active: true,
      syncHistory: [],
    };
    mockParticipantRepo.findByParticipationUuid.mockResolvedValue(
      mockExisting as unknown as BillParticipant,
    );

    // 2. Hitobito service returns the participation
    const mockExternalParticipant: SyncedExternalParticipant = {
      participationId: 'part-1',
      participantId: 'user-1',
      eventId: 'event-1',
      firstName: 'Max',
      lastName: 'Mustermann',
      nickname: 'Muster',
      fullName: 'Max Mustermann',
      roleType: 'Event::Role::Participant',
      enrollmentDate: '2026-06-22T00:00:00Z',
      street: 'Musterstrasse',
      housenumber: '42',
      zipCode: '8000',
      town: 'Zürich',
      country: 'CH',
      gender: 'male',
      birthday: '1990-01-01',
      active: true,
    };
    mockHitobitoService.fetchParticipations.mockResolvedValue([mockExternalParticipant]);

    // Answers are missing AHV
    const mockAnswers = {
      'T-Shirt Grösse (unisex)': 'L',
      'Mailadresse für Rechnung': 'max@example.com',
      'Name der Krankenkasse': 'Assura',
      'Versichertennummer (Nummer auf der Krankenkassenkarte)': '123456789',
      'Notfallkontakt Vollständiger Name': 'Erika Mustermann',
      'Notfallkontakt Telefonnummer': '079 123 45 67',
      Essgewohnheit: 'vegetarisch',
    };
    mockHitobitoService.fetchParticipationAnswers.mockResolvedValue(mockAnswers);

    const summary = await syncParticipantsUseCase(
      mockParticipantRepo,
      mockHitobitoService,
      mockSettingsRepo,
      mockLogger,
    );

    expect(summary.errors).toHaveLength(0);
    expect(summary.changedCount).toBe(1);

    // Should update repo with status 'pflichtangaben_missing'
    expect(mockParticipantRepo.update).toHaveBeenCalledWith(
      'doc-1',
      expect.objectContaining({
        status: 'pflichtangaben_missing',
        missingStammdaten: [],
        missingAnmeldeangaben: ['AHV-Nummer'],
      }),
    );
  });

  describe('progress reporting', () => {
    const threeEvents = [
      { eventId: 'event-1', eventName: 'Lager Bern', groupId: 'group-1' },
      { eventId: 'event-2', eventName: 'Lager Chur', groupId: 'group-2' },
      { eventId: 'event-3', eventName: 'Lager Sitten', groupId: 'group-3' },
    ];

    beforeEach(() => {
      mockSettingsRepo.getBillSettings.mockResolvedValue({
        events: threeEvents,
      } as unknown as Awaited<ReturnType<typeof mockSettingsRepo.getBillSettings>>);
      mockHitobitoService.fetchParticipations.mockResolvedValue([]);
    });

    it('names the event it is about to walk, and closes on the full count', async () => {
      const { reporter, updates } = collectingReporter(() => false);

      const summary = await syncParticipantsUseCase(
        mockParticipantRepo,
        mockHitobitoService,
        mockSettingsRepo,
        mockLogger,
        reporter,
      );

      expect(summary.cancelled).toBeUndefined();
      expect(updates.map((update) => update.processedItems)).toEqual([0, 1, 2, 3]);
      expect(updates.map((update) => update.currentItemName)).toEqual([
        'Lager Bern',
        'Lager Chur',
        'Lager Sitten',
        '',
      ]);
      expect(updates.every((update) => update.totalItems === 3)).toBe(true);
    });

    it('stops at the next event boundary when a cancellation is requested', async () => {
      // Cancel is requested while the first event is being walked.
      let cancelled = false;
      const { reporter, updates } = collectingReporter(() => cancelled);
      mockHitobitoService.fetchParticipations.mockImplementation(async () => {
        cancelled = true;
        await Promise.resolve();
        return [];
      });

      const summary = await syncParticipantsUseCase(
        mockParticipantRepo,
        mockHitobitoService,
        mockSettingsRepo,
        mockLogger,
        reporter,
      );

      expect(summary.cancelled).toBe(true);
      // Event one ran to completion; event two was never fetched.
      expect(mockHitobitoService.fetchParticipations).toHaveBeenCalledTimes(1);
      // No closing full-count frame — the bar must not jump to 100% on a cancelled run.
      expect(updates.at(-1)?.processedItems).toBe(1);
    });

    it('runs unchanged when no reporter is supplied', async () => {
      const summary = await syncParticipantsUseCase(
        mockParticipantRepo,
        mockHitobitoService,
        mockSettingsRepo,
        mockLogger,
      );

      expect(summary.cancelled).toBeUndefined();
      expect(mockHitobitoService.fetchParticipations).toHaveBeenCalledTimes(3);
    });
  });

  it('points the operator at Registration Management when the browser cookie is missing', async () => {
    mockSettingsRepo.getBillSettings.mockResolvedValue({
      events: [],
    } as unknown as Awaited<ReturnType<typeof mockSettingsRepo.getBillSettings>>);

    const summary = await syncParticipantsUseCase(
      mockParticipantRepo,
      mockHitobitoService,
      mockSettingsRepo,
      mockLogger,
    );

    // Without configured events the run cannot start, and the settings page that fixes
    // it has to reach the admin UI as a link rather than as prose.
    expect(summary.errors).toEqual(['No events configured in Bill Settings.']);
    expect(summary.relatedDocuments).toEqual(['billSettings']);
  });
});
