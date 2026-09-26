/* eslint-disable @typescript-eslint/unbound-method, unicorn/no-null */
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
import { isBillable } from '@/features/billing/services/billing-status';
import { CEVIDB_SESSION_EXPIRED_MESSAGE } from '@/features/billing/services/cevidb-session';
import type {
  JobProgressReporter,
  JobProgressUpdate,
} from '@/features/billing/services/job-progress-reporter';
import { syncParticipantsUseCase } from '@/features/billing/services/sync-service';
import type { BillParticipant } from '@/features/payload-cms/payload-types';
import { SessionExpiredError } from '@/features/registration_process/hitobito-api/errors';

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
      finish: async (): Promise<void> => {
        await Promise.resolve();
      },
    },
  };
};

/** A synced participation whose Cevi.DB record differs from what is on file. */
const externalParticipant = (
  overrides: Partial<SyncedExternalParticipant> = {},
): SyncedExternalParticipant => ({
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
  zip: '8000',
  zipCode: '8000',
  town: 'Zürich',
  country: 'CH',
  gender: 'male',
  birthday: '1990-01-01',
  active: true,
  ...overrides,
});

/** A registration that passes validation, so the tests below isolate the billing rule. */
const completeAnswers = {
  'AHV-Nummer?': '756.1234.5678.90',
  'T-Shirt Grösse (unisex)': 'L',
  'Mailadresse für Rechnung': 'max@example.com',
  'Name der Krankenkasse': 'Assura',
  'Versichertennummer (Nummer auf der Krankenkassenkarte)': '123456789',
  'Notfallkontakt Vollständiger Name': 'Erika Mustermann',
  'Notfallkontakt Telefonnummer': '079 123 45 67',
  Essgewohnheit: 'vegetarisch',
  'Administrationsangaben Anmeldestatus': 'erfasst durch AVP',
};

const billedRow = (overrides: Record<string, unknown> = {}): BillParticipant =>
  ({
    id: 'doc-1',
    participationUuid: 'part-1',
    userId: 'user-1',
    eventId: 'event-1',
    groupId: 'group-1',
    eventName: 'Test Event',
    status: 'bill_sent',
    roleType: 'Event::Role::Participant',
    firstName: 'Max',
    lastName: 'Mustermann',
    nickname: 'Muster',
    fullName: 'Max Mustermann',
    street: 'Musterstrasse',
    zip: '8000',
    zipCode: '8000',
    town: 'Zürich',
    gender: 'male',
    birthday: '1990-01-01',
    email: 'max@example.com',
    anmeldestatus: 'erfasst durch AVP',
    missingStammdaten: [],
    missingAnmeldeangaben: [],
    active: true,
    // The row carries a raised bill.
    invoiceNumber: '2027-0001',
    billCreatedDate: '2027-01-05T10:00:00Z',
    syncHistory: [],
    ...overrides,
  }) as unknown as BillParticipant;

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
      fetchAddressManagerEmails: jest.fn(),
      updateParticipationAnswer: jest
        .fn()
        .mockResolvedValue({ changed: true, previous: 'erfasst durch AVP' }),
    };

    mockSettingsRepo = {
      getBillSettings: jest.fn().mockResolvedValue({
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
      getHoefe: jest.fn(),
      getHofEvents: jest.fn().mockResolvedValue([mockEvent]),
      upsertHoefe: jest.fn(),
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
      'Administrationsangaben Anmeldestatus': 'erfasst durch AVP',
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
      'Administrationsangaben Anmeldestatus': 'erfasst durch AVP',
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

  it('blocks billing when the Anmeldestatus answer is missing', async () => {
    // The Hof confirms a registration via "Administrationsangaben » Anmeldestatus". Without
    // it we do not know what we would be invoicing, so the row is not billable.
    const withoutAnmeldestatus = Object.fromEntries(
      Object.entries(completeAnswers).filter(([question]) => !question.includes('Anmeldestatus')),
    );

    mockParticipantRepo.findByParticipationUuid.mockResolvedValue({
      id: 'doc-1',
      participationUuid: 'part-1',
      userId: 'user-1',
      eventId: 'event-1',
      status: 'new',
      roleType: 'Event::Role::Participant',
      active: true,
      syncHistory: [],
    } as unknown as BillParticipant);
    mockHitobitoService.fetchParticipations.mockResolvedValue([externalParticipant()]);
    mockHitobitoService.fetchParticipationAnswers.mockResolvedValue(withoutAnmeldestatus);

    await syncParticipantsUseCase(
      mockParticipantRepo,
      mockHitobitoService,
      mockSettingsRepo,
      mockLogger,
    );

    const [, update] = mockParticipantRepo.update.mock.calls[0] ?? [];
    expect(update?.status).toBe('pflichtangaben_missing');
    expect(update?.missingAnmeldeangaben).toEqual(['Anmeldestatus']);
    expect(isBillable(String(update?.status))).toBe(false);
  });

  it('ignores Aufbau- and Abbaulager events configured in settings and deactivates active participants', async () => {
    mockSettingsRepo.getHofEvents.mockResolvedValue([
      { eventId: 'haupt-1', eventName: 'Hauptlager conveniat27 - Test', groupId: '1' },
      { eventId: 'aufbau-1', eventName: 'Aufbaulager conveniat27 - Test', groupId: '1' },
      { eventId: 'abbau-1', eventName: 'Abbaulager conveniat27 - Test', groupId: '1' },
    ]);
    mockSettingsRepo.getBillSettings.mockResolvedValue({
      rolePricing: [],
    } as unknown as Awaited<ReturnType<typeof mockSettingsRepo.getBillSettings>>);

    const unbilledAufbauParticipant = {
      id: 'part-aufbau-1',
      status: 'new',
      eventId: 'aufbau-1',
      participationUuid: 'uuid-1',
    };
    const billedAbbauParticipant = {
      id: 'part-abbau-1',
      status: 'bill_sent',
      invoiceNumber: '2027-0042',
      eventId: 'abbau-1',
      participationUuid: 'uuid-2',
    };

    mockParticipantRepo.findActiveForEvent.mockImplementation((eventId: string) => {
      if (eventId === 'aufbau-1') return Promise.resolve([unbilledAufbauParticipant as never]);
      if (eventId === 'abbau-1') return Promise.resolve([billedAbbauParticipant as never]);
      return Promise.resolve([]);
    });

    mockHitobitoService.fetchParticipations.mockResolvedValue([]);

    const summary = await syncParticipantsUseCase(
      mockParticipantRepo,
      mockHitobitoService,
      mockSettingsRepo,
      mockLogger,
    );

    // Only Hauptlager event should be queried, Aufbau and Abbau must be skipped
    expect(mockHitobitoService.fetchParticipations).toHaveBeenCalledTimes(1);
    expect(mockHitobitoService.fetchParticipations).toHaveBeenCalledWith('1', 'haupt-1');
    expect(summary.errors).toHaveLength(0);

    const [call1, call2] = mockParticipantRepo.update.mock.calls;
    expect(call1?.[0]).toBe('part-aufbau-1');
    expect(call1?.[1]?.status).toBe('removed');
    const aufbauHistory = call1?.[1]?.syncHistory as { action: string; reviewReason?: string }[];
    expect(aufbauHistory.at(-1)?.action).toBe('removed_detected');
    expect(aufbauHistory.at(-1)?.reviewReason).toContain('ausgeschlossen');

    expect(call2?.[0]).toBe('part-abbau-1');
    expect(call2?.[1]?.status).toBe('needs_manual_review');
    const abbauHistory = call2?.[1]?.syncHistory as { action: string; reviewReason?: string }[];
    expect(abbauHistory.at(-1)?.action).toBe('manual_review_required');
    expect(abbauHistory.at(-1)?.reviewReason).toContain('ausgeschlossen');

    expect(summary.removedCount).toBe(1);
    expect(summary.needsReviewCount).toBe(1);
  });

  it('safely handles malformed settings rows with missing or non-string eventName without throwing', async () => {
    mockSettingsRepo.getHofEvents.mockResolvedValue([
      { eventId: 'h-1', eventName: 'Hauptlager conveniat27 - Test', groupId: '1' },
      { eventId: 'malformed-1', eventName: undefined as unknown as string, groupId: '1' },
      { eventId: 'malformed-2', eventName: null as unknown as string, groupId: '1' },
    ]);
    mockSettingsRepo.getBillSettings.mockResolvedValue({
      rolePricing: [],
    } as unknown as Awaited<ReturnType<typeof mockSettingsRepo.getBillSettings>>);

    mockHitobitoService.fetchParticipations.mockResolvedValue([]);

    const summary = await syncParticipantsUseCase(
      mockParticipantRepo,
      mockHitobitoService,
      mockSettingsRepo,
      mockLogger,
    );

    expect(mockHitobitoService.fetchParticipations).toHaveBeenCalledTimes(3);
    expect(summary.errors).toHaveLength(0);
  });

  describe('progress reporting', () => {
    const threeEvents = [
      { eventId: 'event-1', eventName: 'Lager Bern', groupId: 'group-1' },
      { eventId: 'event-2', eventName: 'Lager Chur', groupId: 'group-2' },
      { eventId: 'event-3', eventName: 'Lager Sitten', groupId: 'group-3' },
    ];

    beforeEach(() => {
      mockSettingsRepo.getHofEvents.mockResolvedValue(threeEvents);
      mockSettingsRepo.getBillSettings.mockResolvedValue(
        {} as unknown as Awaited<ReturnType<typeof mockSettingsRepo.getBillSettings>>,
      );
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
    mockSettingsRepo.getHofEvents.mockResolvedValue([]);
    mockSettingsRepo.getBillSettings.mockResolvedValue(
      {} as unknown as Awaited<ReturnType<typeof mockSettingsRepo.getBillSettings>>,
    );

    const summary = await syncParticipantsUseCase(
      mockParticipantRepo,
      mockHitobitoService,
      mockSettingsRepo,
      mockLogger,
    );

    // Without configured events the run cannot start, and the Höfe list that fixes it has
    // to reach the admin UI as a link rather than as prose.
    expect(summary.errors).toEqual(['No events configured on any Hof.']);
    expect(summary.relatedDocuments).toEqual(['hoefe']);
  });

  it('stops the run when the Cevi.DB session is gone instead of emptying every row', async () => {
    // An unreadable participation used to arrive as `{}`, which is indistinguishable from
    // a registration whose Pflichtangaben were all deleted: the sync would have parked
    // every row of every event as incomplete and chased their Adressverwalter.
    mockSettingsRepo.getHofEvents.mockResolvedValue([
      mockEvent,
      { eventId: 'event-2', eventName: 'Second', groupId: 'group-2' },
    ]);
    mockSettingsRepo.getBillSettings.mockResolvedValue({
      rolePricing: [{ roleTypePattern: 'Event::Role::Participant', label: 'TN', amount: 1 }],
    } as unknown as Awaited<ReturnType<typeof mockSettingsRepo.getBillSettings>>);
    mockHitobitoService.fetchParticipations.mockResolvedValue([externalParticipant()]);
    mockHitobitoService.fetchParticipationAnswers.mockRejectedValue(
      new SessionExpiredError('https://db.cevi.ch/groups/7/events/42/participations/900/edit'),
    );

    const summary = await syncParticipantsUseCase(
      mockParticipantRepo,
      mockHitobitoService,
      mockSettingsRepo,
      mockLogger,
    );

    expect(summary.errors).toEqual([CEVIDB_SESSION_EXPIRED_MESSAGE]);
    expect(summary.relatedDocuments).toEqual(['registrationManagement']);
    // The second event is never attempted, and nothing was written from a blind read.
    expect(mockHitobitoService.fetchParticipations).toHaveBeenCalledTimes(1);
    expect(mockParticipantRepo.update).not.toHaveBeenCalled();
    expect(mockParticipantRepo.create).not.toHaveBeenCalled();
  });
  describe('a participation that has already been billed', () => {
    it('parks a billed participant for review instead of queueing a second bill', async () => {
      // The role stops being priced — the settings row was renamed. Before, this wrote
      // `invalid_anmeldeangaben`, and the next sync after the row came back wrote `new`,
      // which is what earned the participant a second invoice.
      mockSettingsRepo.getHofEvents.mockResolvedValue([mockEvent]);
      mockSettingsRepo.getBillSettings.mockResolvedValue({
        rolePricing: [{ roleTypePattern: 'Event::Role::Leader', label: 'Leitend', amount: 1 }],
      } as unknown as Awaited<ReturnType<typeof mockSettingsRepo.getBillSettings>>);
      mockParticipantRepo.findByParticipationUuid.mockResolvedValue(billedRow());
      mockHitobitoService.fetchParticipations.mockResolvedValue([externalParticipant()]);
      mockHitobitoService.fetchParticipationAnswers.mockResolvedValue(completeAnswers);

      await syncParticipantsUseCase(
        mockParticipantRepo,
        mockHitobitoService,
        mockSettingsRepo,
        mockLogger,
      );

      const [, update] = mockParticipantRepo.update.mock.calls[0] ?? [];
      expect(update?.status).toBe('needs_manual_review');
      // Whatever else changed, the row must not be billable again.
      expect(isBillable(String(update?.status))).toBe(false);
    });

    it('records why it needs a human, in the sync history', async () => {
      mockParticipantRepo.findByParticipationUuid.mockResolvedValue(billedRow());
      mockHitobitoService.fetchParticipations.mockResolvedValue([
        externalParticipant({ town: 'Bern' }),
      ]);
      mockHitobitoService.fetchParticipationAnswers.mockResolvedValue(completeAnswers);

      await syncParticipantsUseCase(
        mockParticipantRepo,
        mockHitobitoService,
        mockSettingsRepo,
        mockLogger,
      );

      const [, update] = mockParticipantRepo.update.mock.calls[0] ?? [];
      expect(update?.status).toBe('needs_manual_review');
      const history = update?.syncHistory as { action: string; reviewReason?: string }[];
      expect(history.at(-1)?.action).toBe('manual_review_required');
      expect(history.at(-1)?.reviewReason).toContain('geändert');
    });

    it('counts the parked participations so the toolbar can report them', async () => {
      mockParticipantRepo.findByParticipationUuid.mockResolvedValue(billedRow());
      mockHitobitoService.fetchParticipations.mockResolvedValue([
        externalParticipant({ town: 'Bern' }),
      ]);
      mockHitobitoService.fetchParticipationAnswers.mockResolvedValue(completeAnswers);

      const summary = await syncParticipantsUseCase(
        mockParticipantRepo,
        mockHitobitoService,
        mockSettingsRepo,
        mockLogger,
      );

      expect(summary.needsReviewCount).toBe(1);
    });

    it('retries the Anmeldestatus write-back when the Cevi.DB never took it', async () => {
      // The bill is out, but the Cevi.DB still says "erfasst durch AVP" — the write-back
      // at send time failed. The sync is the only thing that comes back to it.
      mockParticipantRepo.findByParticipationUuid.mockResolvedValue(billedRow());
      mockHitobitoService.fetchParticipations.mockResolvedValue([externalParticipant()]);
      mockHitobitoService.fetchParticipationAnswers.mockResolvedValue(completeAnswers);

      const summary = await syncParticipantsUseCase(
        mockParticipantRepo,
        mockHitobitoService,
        mockSettingsRepo,
        mockLogger,
      );

      expect(mockHitobitoService.updateParticipationAnswer).toHaveBeenCalledWith(
        'group-1',
        'event-1',
        'part-1',
        ['anmeldestatus'],
        'Rechnung gestellt',
        ['definitiv'],
      );

      const [, update] = mockParticipantRepo.update.mock.calls[0] ?? [];
      expect(update?.anmeldestatus).toBe('Rechnung gestellt');
      // The value this run wrote itself must not park the row for a human.
      expect(update?.status).toBe('bill_sent');
      const history = update?.syncHistory as { action: string; value?: string }[];
      expect(history[0]).toEqual(
        expect.objectContaining({
          action: 'anmeldestatus_written_to_cevidb',
          value: 'Rechnung gestellt',
        }),
      );
      expect(summary.errors).toHaveLength(0);
    });

    it('does not report the value it just wrote as an incoming change', async () => {
      // The row already reads "Rechnung gestellt"; the Cevi.DB lost it. Writing it back
      // and then recording "Rechnung gestellt → erfasst durch AVP" would be a diff of our
      // own making.
      mockParticipantRepo.findByParticipationUuid.mockResolvedValue(
        billedRow({ anmeldestatus: 'Rechnung gestellt' }),
      );
      mockHitobitoService.fetchParticipations.mockResolvedValue([externalParticipant()]);
      mockHitobitoService.fetchParticipationAnswers.mockResolvedValue(completeAnswers);

      await syncParticipantsUseCase(
        mockParticipantRepo,
        mockHitobitoService,
        mockSettingsRepo,
        mockLogger,
      );

      const [, update] = mockParticipantRepo.update.mock.calls[0] ?? [];
      const history = update?.syncHistory as { action: string; diff?: Record<string, unknown> }[];
      expect(history.at(-1)?.diff?.['anmeldestatus']).toBeUndefined();
      expect(update?.anmeldestatus).toBe('Rechnung gestellt');
    });

    it('keeps the row and names the person when the retry fails', async () => {
      mockParticipantRepo.findByParticipationUuid.mockResolvedValue(billedRow());
      mockHitobitoService.fetchParticipations.mockResolvedValue([externalParticipant()]);
      mockHitobitoService.fetchParticipationAnswers.mockResolvedValue(completeAnswers);
      mockHitobitoService.updateParticipationAnswer.mockRejectedValue(new Error('Status 500'));

      const summary = await syncParticipantsUseCase(
        mockParticipantRepo,
        mockHitobitoService,
        mockSettingsRepo,
        mockLogger,
      );

      const [, update] = mockParticipantRepo.update.mock.calls[0] ?? [];
      expect(update?.anmeldestatus).toBe('erfasst durch AVP');
      const history = update?.syncHistory as { action: string; reviewReason?: string }[];
      expect(history[0]?.action).toBe('anmeldestatus_writeback_failed');
      expect(summary.errors[0]).toContain('Max Mustermann');
      // A failed write-back is not a reason to stop syncing the event.
      expect(summary.errors).toHaveLength(1);
    });

    it('leaves a billed participant alone when nothing about them changed', async () => {
      // A settled row: the bill is out and the Cevi.DB already says so, so there is
      // nothing left for this sync to do or to write back.
      mockParticipantRepo.findByParticipationUuid.mockResolvedValue(
        billedRow({ anmeldestatus: 'Rechnung gestellt' }),
      );
      mockHitobitoService.fetchParticipations.mockResolvedValue([externalParticipant()]);
      mockHitobitoService.fetchParticipationAnswers.mockResolvedValue({
        ...completeAnswers,
        'Administrationsangaben Anmeldestatus': 'Rechnung gestellt',
      });

      const summary = await syncParticipantsUseCase(
        mockParticipantRepo,
        mockHitobitoService,
        mockSettingsRepo,
        mockLogger,
      );

      const [, update] = mockParticipantRepo.update.mock.calls[0] ?? [];
      // Only the sync timestamp is touched; the status is not in the payload at all.
      expect(update?.status).toBeUndefined();
      expect(summary.needsReviewCount).toBe(0);
      expect(summary.unchangedCount).toBe(1);
    });
  });
});
