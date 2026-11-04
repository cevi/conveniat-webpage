import { isValidQrReference } from '@/features/billing-core/qr-reference';
import { calculateVisitDayBill } from '@/features/visit-day/billing/visit-day-bill-amount';
import {
  visitDayBillReference,
  visitDayInvoiceNumber,
} from '@/features/visit-day/billing/visit-day-bill-reference';

const prices = { withLunch: 25, withoutLunch: 10, vatRate: 8.1 };

describe('calculateVisitDayBill', () => {
  it('charges one ticket per person at the price of their lunch choice', () => {
    expect(calculateVisitDayBill({ persons: 2, withLunch: true }, prices, 'de')).toEqual({
      lines: [{ label: 'Besuchstag mit Mittagessen', quantity: 2, unitPrice: 25, amount: 50 }],
      total: 50,
      vatAmount: 3.75,
      vatRate: 8.1,
    });
    expect(calculateVisitDayBill({ persons: 1, withLunch: false }, prices, 'fr').lines).toEqual([
      { label: 'Journée des visites sans repas de midi', quantity: 1, unitPrice: 10, amount: 10 },
    ]);
  });

  it('prints no VAT at a rate of 0', () => {
    expect(
      calculateVisitDayBill({ persons: 2, withLunch: true }, { ...prices, vatRate: 0 }, 'de')
        .vatAmount,
    ).toBe(0);
  });

  it('counts in Rappen, so prices with cents add up exactly', () => {
    const bill = calculateVisitDayBill(
      { persons: 3, withLunch: true },
      { ...prices, withLunch: 0.1 },
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
