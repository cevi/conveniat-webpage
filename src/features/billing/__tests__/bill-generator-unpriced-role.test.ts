/* eslint-disable unicorn/no-useless-undefined -- the port methods under test resolve to
   nothing, and saying so explicitly is clearer than a bare jest.fn(). */
/* eslint-disable @typescript-eslint/unbound-method -- asserting on a jest mock reads it off
   its object by design; it is never called from there. */
import type { HitobitoServicePort } from '@/features/billing/ports/hitobito-service.port';
import type { ParticipantRepositoryPort } from '@/features/billing/ports/participant-repository.port';
import type { SettingsPort } from '@/features/billing/ports/settings.port';
import {
  generateBillsUseCase,
  resolvePricing,
} from '@/features/billing/services/bill-generator-service';
import type { BillParticipant } from '@/features/payload-cms/payload-types';

const PRICING = [
  {
    roleTypePattern: 'Event::Role::Participant',
    label: 'Teilnehmendenbeitrag',
    amount: 330,
    vatCode: '8.1%',
  },
  {
    roleTypePattern: 'Event::Role::Leader',
    label: 'Leitendenbeitrag',
    amount: 160,
    vatCode: '8.1%',
  },
];

const participant = (overrides: Partial<BillParticipant>): BillParticipant =>
  ({
    id: 'p1',
    status: 'new',
    userId: '123456',
    eventId: '1234',
    participationUuid: '9012',
    fullName: 'Max Mustermann',
    roleType: 'Event::Role::Participant',
    ...overrides,
  }) as unknown as BillParticipant;

const buildDependencies = (
  documents: BillParticipant[],
): {
  participantRepo: jest.Mocked<ParticipantRepositoryPort>;
  settingsRepo: jest.Mocked<SettingsPort>;
  hitobitoService: jest.Mocked<HitobitoServicePort>;
  logger: { info: jest.Mock; warn: jest.Mock; error: jest.Mock };
} => {
  const participantRepo = {
    findPendingBilling: jest.fn().mockResolvedValue(documents),
    update: jest.fn().mockResolvedValue(undefined),
    uploadPdf: jest.fn().mockResolvedValue({ id: 'pdf1' }),
  } as unknown as jest.Mocked<ParticipantRepositoryPort>;

  const settingsRepo = {
    getBillSettings: jest.fn().mockResolvedValue({
      creditorIban: 'CH1030700114904034095',
      creditorName: 'conveniat27',
      rolePricing: PRICING,
    }),
    updateNextReferenceNumber: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<SettingsPort>;

  const hitobitoService = {
    fetchPersonDetails: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<HitobitoServicePort>;

  return {
    participantRepo,
    settingsRepo,
    hitobitoService,
    logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
  };
};

describe('resolvePricing', () => {
  it('finds the row that governs a role', () => {
    expect(resolvePricing('Event::Role::Leader', PRICING)?.amount).toBe(160);
  });

  it('returns nothing for a role no row prices, rather than the first row', () => {
    // Falling back used to bill an unpriced role at a neighbour's rate.
    expect(resolvePricing('Event::Role::Cook', PRICING)).toBeUndefined();
  });

  it('returns nothing when no pricing is configured', () => {
    expect(resolvePricing('Event::Role::Leader', [])).toBeUndefined();
  });
});

describe('generateBillsUseCase with an unpriced role', () => {
  it('refuses to bill it and flags the registration instead', async () => {
    const { participantRepo, settingsRepo, hitobitoService, logger } = buildDependencies([
      participant({ roleType: 'Event::Role::Cook' }),
    ]);

    const summary = await generateBillsUseCase(
      participantRepo,
      settingsRepo,
      hitobitoService,
      logger,
    );

    expect(participantRepo.uploadPdf).not.toHaveBeenCalled();
    expect(summary.generatedCount).toBe(0);
    expect(summary.skippedCount).toBe(1);

    expect(participantRepo.update).toHaveBeenCalledWith('p1', {
      status: 'invalid_anmeldeangaben',
      missingAnmeldeangaben: [
        'Rollentyp "Event::Role::Cook" ist in den Rechnungs-Einstellungen nicht konfiguriert.',
      ],
    });
  });

  it('names the role and points the operator at the settings', async () => {
    const { participantRepo, settingsRepo, hitobitoService, logger } = buildDependencies([
      participant({ roleType: 'Event::Role::Cook' }),
    ]);

    const summary = await generateBillsUseCase(
      participantRepo,
      settingsRepo,
      hitobitoService,
      logger,
    );

    expect(summary.errors).toEqual([
      'Max Mustermann: Rollentyp "Event::Role::Cook" ist in den Rechnungs-Einstellungen nicht konfiguriert.',
    ]);
    expect(summary.relatedDocuments).toEqual(['billSettings']);
  });

  it('does not record the same reason twice when a run is repeated', async () => {
    const { participantRepo, settingsRepo, hitobitoService, logger } = buildDependencies([
      participant({
        roleType: 'Event::Role::Cook',
        missingAnmeldeangaben: [
          'Rollentyp "Event::Role::Cook" ist in den Rechnungs-Einstellungen nicht konfiguriert.',
        ],
      }),
    ]);

    await generateBillsUseCase(participantRepo, settingsRepo, hitobitoService, logger);

    expect(participantRepo.update).toHaveBeenCalledWith('p1', {
      status: 'invalid_anmeldeangaben',
      missingAnmeldeangaben: [
        'Rollentyp "Event::Role::Cook" ist in den Rechnungs-Einstellungen nicht konfiguriert.',
      ],
    });
  });

  it('leaves a priced participant alone', async () => {
    const { participantRepo, settingsRepo, hitobitoService, logger } = buildDependencies([
      participant({ roleType: 'Event::Role::Leader' }),
    ]);

    const summary = await generateBillsUseCase(
      participantRepo,
      settingsRepo,
      hitobitoService,
      logger,
    );

    // It gets as far as needing a PDF, which is all this test cares about: it was not
    // rejected for its role.
    expect(summary.errors.every((error) => !error.includes('nicht konfiguriert'))).toBe(true);
  });
});
