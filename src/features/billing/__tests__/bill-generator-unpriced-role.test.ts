/* eslint-disable unicorn/no-useless-undefined -- the port methods under test resolve to
   nothing, and saying so explicitly is clearer than a bare jest.fn(). */
/* eslint-disable @typescript-eslint/unbound-method -- asserting on a jest mock reads it off
   its object by design; it is never called from there. */
import type { HitobitoServicePort } from '@/features/billing/ports/hitobito-service.port';
import type { ParticipantRepositoryPort } from '@/features/billing/ports/participant-repository.port';
import type { SettingsPort } from '@/features/billing/ports/settings.port';
import {
  buildCreditorFooterItems,
  generateBillsUseCase,
  layoutFooterLines,
  resolvePricing,
} from '@/features/billing/services/bill-generator-service';
import { NEEDS_MANUAL_REVIEW } from '@/features/billing/services/billing-status';
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

describe('generateBillsUseCase and a participant who already has a bill', () => {
  it('parks them for review instead of minting a second invoice', async () => {
    // Only reachable if something put a billed row back into a billable status behind the
    // sync's back. Billing it again would issue a second invoice number and a second QR
    // reference against a bill the participant may already have paid.
    const { participantRepo, settingsRepo, hitobitoService, logger } = buildDependencies([
      participant({
        status: 'new',
        roleType: 'Event::Role::Leader',
        invoiceNumber: '2027-0001',
        billCreatedDate: '2027-01-05T10:00:00Z',
      }),
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
    expect(summary.errors[0]).toContain('2027-0001');

    const [, update] = participantRepo.update.mock.calls[0] ?? [];
    expect(update?.status).toBe(NEEDS_MANUAL_REVIEW);
  });

  it('still lets an operator regenerate one deliberately, by naming them', async () => {
    // The per-row "Neu generieren" action passes a participantId — that is the operator
    // saying they mean it, and it has to keep working.
    const { participantRepo, settingsRepo, hitobitoService, logger } = buildDependencies([
      participant({
        status: 'new',
        roleType: 'Event::Role::Leader',
        invoiceNumber: '2027-0001',
        billCreatedDate: '2027-01-05T10:00:00Z',
      }),
    ]);

    const summary = await generateBillsUseCase(
      participantRepo,
      settingsRepo,
      hitobitoService,
      logger,
      'p1',
    );

    expect(summary.errors.every((error) => !error.includes('besteht bereits'))).toBe(true);
  });

  it('bills the statuses that used to be dead ends', async () => {
    for (const status of ['updated', 're_added'] as const) {
      const { participantRepo, settingsRepo, hitobitoService, logger } = buildDependencies([
        participant({ status, roleType: 'Event::Role::Leader' }),
      ]);

      const summary = await generateBillsUseCase(
        participantRepo,
        settingsRepo,
        hitobitoService,
        logger,
      );

      expect(summary.errors.every((error) => !error.includes('kann nicht verrechnet'))).toBe(true);
    }
  });
});

describe('reference number reservation', () => {
  it('reserves the whole block before the first bill is written', async () => {
    const { participantRepo, settingsRepo, hitobitoService, logger } = buildDependencies([
      participant({ id: 'p1', roleType: 'Event::Role::Leader' }),
      participant({ id: 'p2', roleType: 'Event::Role::Leader' }),
      participant({ id: 'p3', roleType: 'Event::Role::Leader' }),
    ]);
    (settingsRepo.getBillSettings as jest.Mock).mockResolvedValue({
      creditorIban: 'CH1030700114904034095',
      creditorName: 'conveniat27',
      rolePricing: PRICING,
      nextReferenceNumber: 41,
    });

    await generateBillsUseCase(participantRepo, settingsRepo, hitobitoService, logger);

    // Written once, up front, covering every participant the run picked up. A crash
    // partway through then burns numbers rather than reissuing them: the counter used to
    // be saved only after the loop, so a killed run left the next one colliding on the
    // unique `invoiceNumber` for every single participant.
    expect(settingsRepo.updateNextReferenceNumber).toHaveBeenCalledTimes(1);
    expect(settingsRepo.updateNextReferenceNumber).toHaveBeenCalledWith(44);
  });

  it('does not touch the counter when there is nothing to bill', async () => {
    const { participantRepo, settingsRepo, hitobitoService, logger } = buildDependencies([]);

    await generateBillsUseCase(participantRepo, settingsRepo, hitobitoService, logger);

    expect(settingsRepo.updateNextReferenceNumber).not.toHaveBeenCalled();
  });
});

describe('buildCreditorFooterItems', () => {
  const creditor = {
    name: 'conveniat27',
    street: 'Sihlstrasse',
    buildingNumber: '33',
    zip: '8001',
    city: 'Zürich',
    account: 'CH1030700114904034095',
    uid: 'CHE-470.917.124',
    email: 'admin.conveniat27@cevi.ch',
    website: 'conveniat27.ch',
  };

  it('keeps every label attached to its value', () => {
    expect(buildCreditorFooterItems(creditor)).toEqual([
      'conveniat27 | Sihlstrasse 33',
      '8001 Zürich',
      'IBAN: CH1030700114904034095',
      'MWST-Nr.: CHE-470.917.124',
      'E-Mail: admin.conveniat27@cevi.ch',
      'Web: conveniat27.ch',
    ]);
  });

  it('omits the optional items that are not configured', () => {
    const items = buildCreditorFooterItems({
      ...creditor,
      uid: undefined,
      email: '',
      website: undefined,
    });
    expect(items).toEqual([
      'conveniat27 | Sihlstrasse 33',
      '8001 Zürich',
      'IBAN: CH1030700114904034095',
    ]);
  });

  it('drops the dangling separator when there is no building number', () => {
    const items = buildCreditorFooterItems({ ...creditor, street: '', buildingNumber: undefined });
    expect(items[0]).toBe('conveniat27');
  });
});

// One unit per character, so the packing is decided by lengths the test can state.
const measure = (text: string): number => text.length;

describe('layoutFooterLines', () => {
  it('keeps everything on one line when it fits', () => {
    expect(layoutFooterLines(['aaa', 'bbb'], measure, 100)).toEqual(['aaa  |  bbb']);
  });

  it('never splits an item across two lines', () => {
    // The regression: `E-Mail:` used to be left at the end of one line and its address
    // orphaned at the start of the next.
    const items = ['MWST-Nr.: CHE-470.917.124', 'E-Mail: admin.conveniat27@cevi.ch'];
    const lines = layoutFooterLines(items, measure, 30);

    expect(lines).toEqual(items);
    for (const line of lines) {
      expect(line.startsWith('admin.')).toBe(false);
      expect(line.endsWith('E-Mail:')).toBe(false);
    }
  });

  it('fills a line before starting the next', () => {
    expect(layoutFooterLines(['aa', 'bb', 'cc'], measure, 11)).toEqual(['aa  |  bb', 'cc']);
  });

  it('gives an item too wide for the box a line of its own', () => {
    expect(layoutFooterLines(['short', 'a-very-long-item-indeed'], measure, 10)).toEqual([
      'short',
      'a-very-long-item-indeed',
    ]);
  });

  it('returns nothing for no items', () => {
    expect(layoutFooterLines([], measure, 100)).toEqual([]);
  });
});
