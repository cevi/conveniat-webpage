import type { BankPayment } from '@/features/billing/services/payment-csv';
import type { MatchableParticipant } from '@/features/billing/services/payment-matching';
import {
  isConvertedReference,
  isValidQrReference,
  matchPayments,
  OVERPAYMENT_TOLERANCE,
} from '@/features/billing/services/payment-matching';
import { generateQrReference } from '@/features/billing/utils';

const reference = generateQrReference('123012', '34000', '0567000', 1);
const otherReference = generateQrReference('123012', '34000', '0567000', 2);

const payment = (overrides: Partial<BankPayment> = {}): BankPayment => ({
  line: 2,
  reference,
  amount: 330,
  currency: 'CHF',
  bookingDate: '2026-10-08',
  payer: 'Lea Muster',
  transactionReference: 'GS00000000000001',
  message: '',
  ...overrides,
});

const bill = (overrides: Partial<MatchableParticipant> = {}): MatchableParticipant => ({
  id: 'row-1',
  fullName: 'Lea Muster',
  status: 'bill_sent',
  referenceNumber: reference,
  invoiceNumber: 'R-2026-00001',
  invoiceAmount: 330,
  issuedBills: [],
  ...overrides,
});

describe('matchPayments', () => {
  it('books a payment whose reference and amount match an open bill', () => {
    const [match] = matchPayments([payment()], [bill()]);

    expect(match).toEqual(expect.objectContaining({ outcome: 'booked', participantId: 'row-1' }));
    expect(match?.message).toBeUndefined();
  });

  it.each(['bill_created', 'bill_mail_pending', 'reminder_sent', 'needs_manual_review'] as const)(
    'books a bill in status %s',
    (status) => {
      expect(matchPayments([payment()], [bill({ status })])[0]?.outcome).toBe('booked');
    },
  );

  it('books a bill paid with a few francs too much, as when the amount was rounded up', () => {
    const [match] = matchPayments([payment({ amount: 173 })], [bill({ invoiceAmount: 172.96 })]);

    expect(match).toEqual(expect.objectContaining({ outcome: 'booked', participantId: 'row-1' }));
  });

  it('books an overpayment of exactly the tolerance, and leaves one Rappen more', () => {
    expect(
      matchPayments([payment({ amount: 330 + OVERPAYMENT_TOLERANCE })], [bill()])[0]?.outcome,
    ).toBe('booked');
    expect(
      matchPayments([payment({ amount: 330.01 + OVERPAYMENT_TOLERANCE })], [bill()])[0]?.outcome,
    ).toBe('amount_mismatch');
  });

  it('never books a payment short of the bill, even by one Rappen', () => {
    const [match] = matchPayments([payment({ amount: 329.99 })], [bill()]);

    expect(match?.outcome).toBe('amount_mismatch');
  });

  it('leaves a payment of a different amount for the finance team, naming both amounts', () => {
    const [match] = matchPayments([payment({ amount: 300 })], [bill()]);

    expect(match?.outcome).toBe('amount_mismatch');
    expect(match?.message).toContain('Lea Muster');
    expect(match?.message).toContain('CHF 330.00');
    expect(match?.message).toContain('CHF 300.00');
  });

  it('says that Excel destroyed the reference, rather than that it is unknown', () => {
    // What the bank file shows once it has been opened and saved in Excel.
    const [match] = matchPayments([payment({ reference: '-9.22337E+18' })], [bill()]);

    expect(match?.outcome).toBe('invalid_reference');
    expect(match?.message).toContain('Excel');
  });

  it('refuses a reference whose check digit is wrong', () => {
    const typo = `${reference.slice(0, 26)}${String((Number(reference.at(-1)) + 1) % 10)}`;

    expect(isValidQrReference(reference)).toBe(true);
    expect(matchPayments([payment({ reference: typo })], [bill()])[0]?.outcome).toBe(
      'invalid_reference',
    );
  });

  it('reports a reference no bill carries', () => {
    expect(matchPayments([payment()], [])[0]?.outcome).toBe('unknown_reference');
  });

  it('names the bill a payment against a replaced reference was meant for', () => {
    const [match] = matchPayments(
      [payment({ reference: otherReference })],
      [
        bill({
          issuedBills: [
            { invoiceNumber: 'R-2026-00000', referenceNumber: otherReference },
            { invoiceNumber: 'R-2026-00001', referenceNumber: reference },
          ],
        }),
      ],
    );

    expect(match?.outcome).toBe('superseded_bill');
    expect(match?.message).toContain('R-2026-00000');
  });

  it('does not book a payment for a cancelled registration', () => {
    expect(matchPayments([payment()], [bill({ status: 'removed' })])[0]?.outcome).toBe('cancelled');
  });

  it('recognises a file imported twice by its transaction reference', () => {
    const [match] = matchPayments(
      [payment()],
      [bill({ status: 'paid', paymentTransactionReference: 'GS00000000000001' })],
    );

    expect(match?.outcome).toBe('already_booked');
  });

  it('recognises a booked transaction even after the registration was cancelled', () => {
    const [match] = matchPayments(
      [payment()],
      [bill({ status: 'removed', paymentTransactionReference: 'GS00000000000001' })],
    );

    expect(match?.outcome).toBe('already_booked');
  });

  it('links a second payment of a paid bill to it as a double payment', () => {
    const [match] = matchPayments(
      [payment({ transactionReference: 'GS00000000000002' })],
      [bill({ status: 'paid', paymentTransactionReference: 'GS00000000000001' })],
    );

    expect(match?.outcome).toBe('double_payment');
    expect(match?.participantId).toBe('row-1');
  });

  it('books a bill paid twice in the same file once, and links the second as a double payment', () => {
    const matches = matchPayments(
      [payment(), payment({ line: 3, transactionReference: 'GS00000000000003' })],
      [bill()],
    );

    expect(matches.map((match) => match.outcome)).toEqual(['booked', 'double_payment']);
  });

  it('recognises a transaction already stored as a payment, whatever bill it went to', () => {
    // Finance may have moved the payment to a sibling's bill since: the file still adds nothing.
    const [match] = matchPayments([payment()], [bill()], new Set(['GS00000000000001']));

    expect(match?.outcome).toBe('already_booked');
  });

  it('does not book a payment the bank gave no transaction reference', () => {
    // A booking has to name the transaction that paid it, or nobody can trace it later.
    const [match] = matchPayments([payment({ transactionReference: '' })], [bill()]);

    expect(match?.outcome).toBe('missing_transaction_reference');
  });

  it('does not book foreign currency or a debit', () => {
    expect(matchPayments([payment({ currency: 'EUR' })], [bill()])[0]?.outcome).toBe(
      'wrong_currency',
    );
    expect(matchPayments([payment({ amount: -330 })], [bill()])[0]?.outcome).toBe('invalid_amount');
  });
});

describe('isConvertedReference', () => {
  it.each(['-9.2233720368547758e+18', '1.23457E+26'])(
    'recognises %s as a reference a program turned into a number',
    (value) => {
      expect(isConvertedReference(value)).toBe(true);
    },
  );

  it('leaves a real reference alone', () => {
    expect(isConvertedReference(reference)).toBe(false);
  });
});
