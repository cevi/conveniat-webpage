// the log of imports carries access rules that read the group settings; no group matters here
jest.mock('@/config/environment-variables', () => ({ environmentVariables: {} }));

import type { PaymentImporter, PaymentImportSummary } from '@/features/billing-core/bank-import';
import { importBankFile, PaymentFileError } from '@/features/billing-core/bank-import';
import type { BankPayment } from '@/features/billing-core/payment-csv';
import type { Payload } from 'payload';

const HEADER =
  'Referenz\tBetrag\tWährung\tBuchungsdatum\tZahlungspflichtiger\tTransaktionsreferenz';
const file = (...references: string[]): string =>
  [
    HEADER,
    ...references.map(
      (reference, index) => `${reference}\t50\tCHF\t08.10.2026\tLea\tGS${String(index)}`,
    ),
  ].join('\n');

const summaryOf = (payments: BankPayment[]): PaymentImportSummary => ({
  totalCount: payments.length,
  bookedCount: 0,
  alreadyBookedCount: 0,
  errors: [],
  outcomes: {},
});

/** An importer that records what it was handed. */
const importer = (
  key: string,
  claims: (payment: BankPayment) => boolean,
): PaymentImporter & { received: string[] } => {
  const received: string[] = [];
  return {
    key,
    label: { de: key, en: key, fr: key },
    claims,
    received,
    importPayments: async (_payload, payments): Promise<PaymentImportSummary> => {
      await Promise.resolve();
      received.push(...payments.map((payment) => payment.reference));
      return summaryOf(payments);
    },
  };
};

const fakePayload = (): { payload: Payload; create: jest.Mock } => {
  const create = jest.fn(() => Promise.resolve({ id: 'import-1' }));
  return { payload: { create, logger: { info: jest.fn() } } as unknown as Payload, create };
};
const { payload } = fakePayload();

/** The file of `file()` books on 08.10.2026; it was exported the next morning. */
const NOW = new Date('2026-10-09T09:00:00Z');
const source = { actor: 'Finanzen', bankExportedAt: new Date('2026-10-09T08:00:00Z') };
const at = (iso: string): typeof source => ({ ...source, bankExportedAt: new Date(iso) });

describe('importBankFile', () => {
  it('hands each payment to the first kind of bill that claims it, and the rest to the last', async () => {
    const visit = importer('visit-day', (payment) => payment.reference.startsWith('091'));
    const camp = importer('camp', () => false);

    const { sides } = await importBankFile(
      payload,
      file('0901', '0911', 'nonsense'),
      source,
      [visit, camp],
      NOW,
    );

    expect(visit.received).toEqual(['0911']);
    expect(camp.received).toEqual(['0901', 'nonsense']);
    expect(sides.map((side) => [side.key, side.summary.totalCount])).toEqual([
      ['visit-day', 1],
      ['camp', 2],
    ]);
  });

  it('does not ask a kind of bill that has nothing in the file', async () => {
    const visit = importer('visit-day', () => false);
    const camp = importer('camp', () => true);

    const { sides } = await importBankFile(payload, file('0901'), source, [visit, camp], NOW);

    expect(sides.map((side) => side.key)).toEqual(['camp']);
  });

  it('refuses a file without payments before any kind books anything', async () => {
    const camp = importer('camp', () => true);

    await expect(importBankFile(payload, HEADER, source, [camp], NOW)).rejects.toThrow(
      PaymentFileError,
    );
    expect(camp.received).toEqual([]);
  });

  it('keeps when the file was imported and up to when its bank data reach', async () => {
    const { payload: recording, create } = fakePayload();
    const camp = importer('camp', () => true);

    await importBankFile(
      recording,
      file('0901', '0902'),
      { ...source, filename: 'camt054.csv' },
      [camp],
      NOW,
    );

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'bank-imports',
        data: {
          bankExportedAt: '2026-10-09T08:00:00.000Z',
          importedBy: 'Finanzen',
          filename: 'camt054.csv',
          paymentCount: 2,
          bookedCount: 0,
        },
      }),
    );
  });

  it('refuses a bank time in the future or before a booking the file holds', async () => {
    const camp = importer('camp', () => true);

    await expect(
      importBankFile(payload, file('0901'), at('2026-10-10T08:00:00Z'), [camp], NOW),
    ).rejects.toThrow('in der Zukunft');
    await expect(
      importBankFile(payload, file('0901'), at('2026-10-07T18:00:00Z'), [camp], NOW),
    ).rejects.toThrow('Buchungen vom 2026-10-08');
    expect(camp.received).toEqual([]);
  });
});
