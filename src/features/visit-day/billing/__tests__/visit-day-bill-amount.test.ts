import { isValidQrReference } from '@/features/billing-core/qr-reference';
import { calculateVisitDayBill } from '@/features/visit-day/billing/visit-day-bill-amount';
import {
  visitDayBillReference,
  visitDayInvoiceNumber,
} from '@/features/visit-day/billing/visit-day-bill-reference';

const prices = { entryFee: 15, lunchFee: 5, railTicket: 69, vatRate: 8.1 };

const totalFor = (travelPass: string, withLunch: boolean): number =>
  calculateVisitDayBill({ persons: 1, withLunch, travelPasses: [travelPass] }, prices, 'de').total;

describe('calculateVisitDayBill', () => {
  it('prices one person as the price list of the Besuchstag says, with VAT on top', () => {
    expect(totalFor('kein_abo', true)).toBe(96.21); // 89 + 8.1 %
    expect(totalFor('halbtax', true)).toBe(96.21);
    expect(totalFor('ga', true)).toBe(21.62); // 20 + 8.1 %
    expect(totalFor('kein_abo', false)).toBe(90.8); // 84 + 8.1 %
    expect(totalFor('ga', false)).toBe(16.22); // 15 + 8.1 %
    expect(totalFor('unter_6', true)).toBe(21.62);
    expect(totalFor('unter_6', false)).toBe(16.22);
  });

  it('bills each part on a line of its own, the day pass only for who needs one', () => {
    expect(
      calculateVisitDayBill(
        { persons: 2, withLunch: true, travelPasses: ['halbtax', 'ga'] },
        prices,
        'de',
      ),
    ).toEqual({
      lines: [
        { label: 'Eintritt Lagerplatz', quantity: 2, unitPrice: 15, amount: 30 },
        { label: 'Mittagessen im Lager', quantity: 2, unitPrice: 5, amount: 10 },
        {
          label: 'SBB-Tageskarte (vergünstigt, ganze Schweiz)',
          quantity: 1,
          unitPrice: 69,
          amount: 69,
        },
      ],
      netTotal: 109,
      total: 117.83,
      vatAmount: 8.83,
      vatRate: 8.1,
    });
  });

  it('leaves out the lines nobody takes', () => {
    expect(
      calculateVisitDayBill({ persons: 1, withLunch: false, travelPasses: ['ga'] }, prices, 'fr')
        .lines,
    ).toEqual([{ label: 'Entrée sur le terrain du camp', quantity: 1, unitPrice: 15, amount: 15 }]);
  });

  it('bills the day pass for a person whose travel pass is not known', () => {
    expect(
      calculateVisitDayBill({ persons: 2, withLunch: false, travelPasses: ['ga'] }, prices, 'de')
        .total,
    ).toBe(99 + 8.02);
  });

  it('prints no VAT at a rate of 0', () => {
    expect(
      calculateVisitDayBill(
        { persons: 2, withLunch: true, travelPasses: [] },
        { ...prices, vatRate: 0 },
        'de',
      ).vatAmount,
    ).toBe(0);
  });

  it('counts in Rappen, so prices with cents add up exactly', () => {
    const bill = calculateVisitDayBill(
      { persons: 3, withLunch: false, travelPasses: ['ga', 'ga', 'ga'] },
      { ...prices, entryFee: 0.1, vatRate: 0 },
      'de',
    );
    expect(bill.total).toBe(0.3);
  });
});

describe('visitDayBillReference', () => {
  it('starts with 091, so the payment import sends its payments to the Besuchstag', () => {
    const reference = visitDayBillReference(42, 1);
    expect(reference).toHaveLength(27);
    expect(reference.startsWith('091')).toBe(true);
    expect(isValidQrReference(reference)).toBe(true);
  });

  it('gives a bill issued again a reference of its own', () => {
    expect(visitDayBillReference(42, 2)).not.toBe(visitDayBillReference(42, 1));
    expect(visitDayBillReference(43, 1)).not.toBe(visitDayBillReference(42, 1));
  });
});

describe('visitDayInvoiceNumber', () => {
  it('fills in the year and marks a later issue', () => {
    const issuedAt = new Date('2027-03-01T10:00:00Z');
    expect(visitDayInvoiceNumber('BT{{year}}-', 42, 1, issuedAt)).toBe('BT2027-0042');
    expect(visitDayInvoiceNumber('BT{{year}}-', 42, 2, issuedAt)).toBe('BT2027-0042-2');
  });
});
