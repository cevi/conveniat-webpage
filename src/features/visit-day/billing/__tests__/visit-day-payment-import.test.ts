// the bill history's access rules read the group settings; no group matters to matching
jest.mock('@/config/environment-variables', () => ({ environmentVariables: {} }));

import type { BankPayment } from '@/features/billing-core/payment-csv';
import { visitDayBillReference } from '@/features/visit-day/billing/visit-day-bill-reference';
import type { MatchableVisitDayBill } from '@/features/visit-day/billing/visit-day-payment-import';
import {
  isVisitDayPayment,
  matchVisitDayPayments,
} from '@/features/visit-day/billing/visit-day-payment-import';

const payment = (overrides: Partial<BankPayment>): BankPayment => ({
  line: 2,
  reference: visitDayBillReference(7, 1),
  amount: 50,
  currency: 'CHF',
  bookingDate: '2027-03-09',
  payer: 'Anna Muster',
  transactionReference: 'GS1',
  message: '',
  ...overrides,
});

const bill = (overrides: Partial<MatchableVisitDayBill> = {}): MatchableVisitDayBill => ({
  id: 'anna',
  registrationNumber: '5321-B007',
  fullName: 'Anna Muster',
  status: 'open',
  referenceNumber: visitDayBillReference(7, 1),
  invoiceNumber: 'BT2027-0007',
  invoiceAmount: 50,
  issuedBills: [],
  // what Payload returns for a bill not paid
  paymentTransactionReference: null,
  ...overrides,
});

describe('isVisitDayPayment', () => {
  it('claims a valid reference starting with 091 and nothing else', () => {
    expect(isVisitDayPayment({ reference: visitDayBillReference(7, 1) })).toBe(true);
    // a camp reference, and a 091 one with a wrong check digit
    expect(isVisitDayPayment({ reference: '090000000000000000000000003' })).toBe(false);
    const valid = visitDayBillReference(7, 1);
    const wrongCheckDigit = `${valid.slice(0, 26)}${String((Number(valid.at(26)) + 1) % 10)}`;
    expect(isVisitDayPayment({ reference: wrongCheckDigit })).toBe(false);
  });
});

describe('matchVisitDayPayments', () => {
  it('books a payment of the full amount, or up to CHF 5 more', () => {
    const [exact, rounded] = matchVisitDayPayments(
      [payment({}), payment({ amount: 54, transactionReference: 'GS2' })],
      [bill(), bill({ id: 'paul', referenceNumber: visitDayBillReference(7, 1) })],
      new Set(),
    );
    expect(exact?.outcome).toBe('booked');
    // the same bill a second time in one file is paid twice
    expect(rounded?.outcome).toBe('double_payment');
  });

  it('leaves too little, a cancelled bill and a replaced reference to finance', () => {
    const replaced = visitDayBillReference(7, 1);
    const outcomes = matchVisitDayPayments(
      [payment({ amount: 25 }), payment({ transactionReference: 'GS2', reference: replaced })],
      [
        bill({
          referenceNumber: visitDayBillReference(7, 2),
          issuedBills: [
            { invoiceNumber: 'BT2027-0007', referenceNumber: replaced, amount: 50, issuedAt: '' },
          ],
        }),
      ],
      new Set(),
    ).map((match) => match.outcome);
    expect(outcomes).toEqual(['superseded_bill', 'superseded_bill']);

    expect(
      matchVisitDayPayments([payment({ amount: 25 })], [bill()], new Set()).map((m) => m.outcome),
    ).toEqual(['amount_mismatch']);
    expect(
      matchVisitDayPayments([payment({})], [bill({ status: 'cancelled' })], new Set()).map(
        (m) => m.outcome,
      ),
    ).toEqual(['cancelled']);
  });

  it('skips a transaction already stored, so importing a file twice books nothing twice', () => {
    expect(matchVisitDayPayments([payment({})], [bill()], new Set(['GS1']))[0]?.outcome).toBe(
      'already_booked',
    );
  });
});
