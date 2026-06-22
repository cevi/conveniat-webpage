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
import { syncParticipantsUseCase } from '@/features/billing/services/sync-service';
import type { BillParticipant } from '@/features/payload-cms/payload-types';

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
});
