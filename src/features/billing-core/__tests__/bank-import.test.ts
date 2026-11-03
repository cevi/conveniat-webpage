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

const payload = {} as Payload;

describe('importBankFile', () => {
  it('hands each payment to the first kind of bill that claims it, and the rest to the last', async () => {
    const visit = importer('visit-day', (payment) => payment.reference.startsWith('091'));
    const camp = importer('camp', () => false);

    const { sides } = await importBankFile(payload, file('0901', '0911', 'nonsense'), 'Finanzen', [
      visit,
      camp,
    ]);

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

    const { sides } = await importBankFile(payload, file('0901'), 'Finanzen', [visit, camp]);

    expect(sides.map((side) => side.key)).toEqual(['camp']);
  });

  it('refuses a file without payments before any kind books anything', async () => {
    const camp = importer('camp', () => true);

    await expect(importBankFile(payload, HEADER, 'Finanzen', [camp])).rejects.toThrow(
      PaymentFileError,
    );
    expect(camp.received).toEqual([]);
  });
});
