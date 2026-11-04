jest.mock('@/config/environment-variables', () => ({ environmentVariables: {} }));
jest.mock('@/lib/db/redis', () => ({ redis: {} }));
jest.mock('@/lib/db/prisma', () => ({ __esModule: true, default: {} }));

import { buildVisitDayReport } from '@/features/visit-day/billing/visit-day-weekly-report';

const NOW = new Date('2027-03-15T07:00:00Z');
const day = { date: '2027-07-28', capacity: 400, capacityWithoutLunch: 100, quartierIds: [] };
const bill = (
  status: 'open' | 'paid' | 'cancelled',
  amount: number,
  refundDue = 0,
): Parameters<typeof buildVisitDayReport>[2][number] => ({
  visitDate: '2027-07-28T00:00:00.000Z',
  status,
  invoiceAmount: amount,
  ...(status === 'paid' ? { paidAmount: amount } : {}),
  refundDue,
  mailStatus: 'sent' as const,
});

describe('buildVisitDayReport', () => {
  it('counts each day’s places and bills, leaving cancelled registrations out', () => {
    const report = buildVisitDayReport(
      [day],
      new Map([['2027-07-28', { withLunch: 3, withoutLunch: 1 }]]),
      [bill('paid', 50), bill('open', 25), bill('open', 10), bill('cancelled', 10, 10)],
      [
        { action: 'created', createdAt: '2027-03-14T10:00:00.000Z' },
        { action: 'created', createdAt: '2027-03-01T10:00:00.000Z' },
        { action: 'payment_booked', createdAt: '2027-03-13T10:00:00.000Z' },
      ],
      NOW,
    );

    expect(report.days).toEqual([
      {
        date: '2027-07-28',
        capacity: 400,
        capacityWithoutLunch: 100,
        takenWithLunch: 3,
        takenWithoutLunch: 1,
        bills: 3,
        paid: 1,
        open: 2,
        openAmount: 35,
      },
    ]);
    expect(report.totals).toEqual({
      registrations: 3,
      paidAmount: 50,
      openAmount: 35,
      refunds: 1,
      refundAmount: 10,
      mailFailed: 0,
      cancelled: 1,
    });
    // only what happened in the last seven days
    expect(report.lastWeek).toEqual({
      registrations: 1,
      payments: 1,
      cancellations: 0,
      reductions: 0,
    });
  });
});
