import {
  buildDoublePaymentReport,
  buildResolvedDoublePayments,
} from '@/features/billing/services/double-payment-report';
import type { BillPayment } from '@/features/payload-cms/payload-types';

const NOW = new Date('2026-10-21T07:00:00Z');

const payment = (overrides: Partial<BillPayment>): BillPayment => ({
  id: overrides.transactionReference ?? 'payment',
  transactionReference: 'GS00000000000001',
  amount: 160,
  bookingDate: '2026-10-12T00:00:00.000Z',
  payer: 'Lea Muster',
  allocations: [],
  createdAt: NOW.toISOString(),
  updatedAt: NOW.toISOString(),
  ...overrides,
});

const lea = {
  id: 'lea',
  fullName: 'Lea Muster',
  invoiceNumber: '2026-0091',
  invoiceAmount: 160,
  eventName: 'Hof Cevi Uster',
};

describe('buildDoublePaymentReport', () => {
  it('lists each payment of a bill paid twice, with what has to go back', () => {
    const report = buildDoublePaymentReport(
      [lea],
      [
        payment({
          transactionReference: 'GS00000000000002',
          bookingDate: '2026-10-13T00:00:00.000Z',
          allocations: [{ participant: 'lea', amount: 160 }],
        }),
        payment({ allocations: [{ participant: 'lea', amount: 160 }] }),
      ],
      NOW,
    );

    expect(report.totalExcess).toBe(160);
    expect(report.entries).toEqual([
      expect.objectContaining({
        fullName: 'Lea Muster',
        invoiceAmount: 160,
        paid: 320,
        excess: 160,
        payments: [
          expect.objectContaining({ transactionReference: 'GS00000000000001', amount: 160 }),
          expect.objectContaining({ transactionReference: 'GS00000000000002', amount: 160 }),
        ],
      }),
    ]);
  });

  it('leaves out a bill whose second payment was refunded since it was flagged', () => {
    const report = buildDoublePaymentReport(
      [lea],
      [
        payment({ allocations: [{ participant: 'lea', amount: 160 }] }),
        payment({
          transactionReference: 'GS00000000000002',
          refundedDate: '2026-10-20T00:00:00.000Z',
          allocations: [{ participant: 'lea', amount: 160 }],
        }),
      ],
      NOW,
    );

    expect(report.entries).toEqual([]);
    expect(report.totalExcess).toBe(0);
  });

  it('counts only the share of a split payment that went to the bill', () => {
    const report = buildDoublePaymentReport(
      [lea],
      [
        payment({ allocations: [{ participant: 'lea', amount: 160 }] }),
        payment({
          transactionReference: 'GS00000000000002',
          amount: 320,
          allocations: [
            { participant: 'lea', amount: 100 },
            { participant: 'noah', amount: 220 },
          ],
        }),
      ],
      NOW,
    );

    expect(report.entries[0]?.excess).toBe(100);
    expect(report.entries[0]?.payments.map((entry) => entry.amount)).toEqual([160, 100]);
  });
});

describe('buildResolvedDoublePayments', () => {
  const flaggedAndResolved = [
    {
      date: '2026-10-14T09:00:00.000Z',
      action: 'double_payment_detected',
      value: 'CHF 320.00 erhalten für die Rechnung über CHF 160.00',
    },
    {
      date: '2026-10-15T16:30:00.000Z',
      action: 'double_payment_resolved',
      value: 'zugeordnet von Finanzen',
    },
  ];
  const resolvedLea = { ...lea, doublePayment: false, syncHistory: flaggedAndResolved };
  const noah = { id: 'noah', fullName: 'Noah Muster', invoiceNumber: '2026-0412' };

  it('keeps a bill whose second payment was moved to a sibling, and says where it went', () => {
    const resolved = buildResolvedDoublePayments(
      [resolvedLea],
      [
        payment({ matchedParticipant: 'lea', allocations: [{ participant: 'lea', amount: 160 }] }),
        payment({
          transactionReference: 'GS00000000000002',
          matchedParticipant: 'lea',
          allocations: [{ participant: 'noah', amount: 160 }],
        }),
      ],
      [noah],
    );

    expect(resolved).toEqual([
      expect.objectContaining({
        fullName: 'Lea Muster',
        detectedAt: '2026-10-14T09:00:00.000Z',
        resolvedAt: '2026-10-15T16:30:00.000Z',
        resolvedBy: 'zugeordnet von Finanzen',
        payments: [
          expect.objectContaining({
            transactionReference: 'GS00000000000001',
            countsHere: 160,
            elsewhere: [],
          }),
          expect.objectContaining({
            transactionReference: 'GS00000000000002',
            countsHere: 0,
            elsewhere: [{ fullName: 'Noah Muster', invoiceNumber: '2026-0412', amount: 160 }],
          }),
        ],
      }),
    ]);
  });

  it('says when the second payment went back', () => {
    const [entry] = buildResolvedDoublePayments(
      [resolvedLea],
      [
        payment({ allocations: [{ participant: 'lea', amount: 160 }] }),
        payment({
          transactionReference: 'GS00000000000002',
          refundedDate: '2026-10-25T00:00:00.000Z',
          allocations: [{ participant: 'lea', amount: 160 }],
        }),
      ],
      [],
    );

    expect(entry?.payments[1]).toEqual(
      expect.objectContaining({
        countsHere: 0,
        elsewhere: [],
        refundedDate: '2026-10-25T00:00:00.000Z',
      }),
    );
  });

  it('leaves a bill that is paid twice again to the open list', () => {
    const resolved = buildResolvedDoublePayments(
      [{ ...resolvedLea, doublePayment: true }],
      [payment({ allocations: [{ participant: 'lea', amount: 160 }] })],
      [],
    );

    expect(resolved).toEqual([]);
  });

  it('ignores a bill that was flagged but never resolved', () => {
    const resolved = buildResolvedDoublePayments(
      [{ ...resolvedLea, syncHistory: flaggedAndResolved.slice(0, 1) }],
      [],
      [],
    );

    expect(resolved).toEqual([]);
  });
});
