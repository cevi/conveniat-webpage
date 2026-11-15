// the bill history's access rules read the group settings; no group matters to the preview
jest.mock('@/config/environment-variables', () => ({ environmentVariables: {} }));

import { isValidQrReference } from '@/features/billing-core/qr-reference';
import { buildPreviewBill } from '@/features/visit-day/billing/visit-day-bill-preview';

const settings = {
  entryFee: 15,
  lunchFee: 5,
  railTicketPrice: 69,
  vatRate: 8.1,
  invoiceNumberPrefix: 'BT{{year}}-',
  paymentDeadlineDays: 30,
};

describe('buildPreviewBill', () => {
  it('prices two persons with lunch, one with a GA, at the saved prices, in the chosen language', () => {
    const bill = buildPreviewBill(settings, '2027-07-28', 'fr', new Date('2027-03-01T09:00:00Z'));

    expect(bill.invoiceAmount).toBe(117.83);
    expect(bill.vatAmount).toBe(8.83);
    expect(bill.lines?.map((line) => line.label)).toEqual([
      'Entrée sur le terrain du camp',
      'Repas de midi au camp',
      'Carte journalière CFF (à prix réduit, toute la Suisse)',
    ]);
    expect(bill.locale).toBe('fr');
    expect(bill.visitDate.slice(0, 10)).toBe('2027-07-28');
  });

  it('carries an invoice number and a QR reference a real bill could have', () => {
    const bill = buildPreviewBill(settings, '2027-07-28', 'de', new Date('2027-03-01T09:00:00Z'));

    expect(bill.invoiceNumber).toBe('BT2027-0001');
    expect(isValidQrReference(bill.referenceNumber)).toBe(true);
    expect(bill.dueDate.slice(0, 10)).toBe('2027-03-31');
  });
});
