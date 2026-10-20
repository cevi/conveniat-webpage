// The import only reaches the Cevi.DB client through the queued job, never in the request.
jest.mock('@/features/billing/services/email-service', () => ({
  createHitobitoService: jest.fn(),
}));

import { importPayments, PaymentFileError } from '@/features/billing/services/payment-import';
import { generateQrReference } from '@/features/billing/utils';
import type { Payload } from 'payload';

const reference = generateQrReference('123012', '34000', '0567000', 1);

const csv = [
  'Referenz\tBetrag\tWährung\tBuchungsdatum\tZahlungspflichtiger\tTransaktionsreferenz',
  `${reference}\t330\tCHF\t08.10.2026\tLea Muster\tGS00000000000001`,
].join('\n');

const fakePayload = (): {
  payload: Payload;
  update: jest.Mock;
  queue: jest.Mock;
} => {
  const update = jest.fn().mockResolvedValue({});
  const queue = jest.fn().mockResolvedValue({ id: 'job-1' });
  const payload = {
    find: jest.fn().mockResolvedValue({
      docs: [
        {
          id: 'row-1',
          fullName: 'Lea Muster',
          status: 'bill_sent',
          referenceNumber: reference,
          invoiceNumber: 'R-2026-00001',
          invoiceAmount: 330,
          issuedBills: [],
          syncHistory: [],
        },
      ],
    }),
    update,
    jobs: { queue },
    logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
  } as unknown as Payload;
  return { payload, update, queue };
};

describe('importPayments', () => {
  it('stores the transaction that paid the bill on the row and in its history', async () => {
    const { payload, update, queue } = fakePayload();

    const summary = await importPayments(payload, csv, 'Finanzen');

    expect(summary.bookedCount).toBe(1);
    const [call] = update.mock.calls as [{ data: Record<string, unknown> }][];
    const data = call?.[0].data ?? {};
    expect(data).toEqual(
      expect.objectContaining({
        status: 'paid',
        paidDate: '2026-10-08T00:00:00.000Z',
        paidAmount: 330,
        paymentTransactionReference: 'GS00000000000001',
      }),
    );
    const history = data['syncHistory'] as { action: string; value?: string }[];
    expect(history.at(-1)?.action).toBe('payment_booked');
    expect(history.at(-1)?.value).toContain('Transaktion GS00000000000001');
    expect(queue).toHaveBeenCalledWith({
      task: 'writeBackPayments',
      input: { participantIds: ['row-1'] },
    });
  });

  it('notes in the history how much more than the bill was paid', async () => {
    const { payload, update } = fakePayload();
    const overpaid = csv.replace('\t330\t', '\t332\t');

    const summary = await importPayments(payload, overpaid, 'Finanzen');

    expect(summary.bookedCount).toBe(1);
    expect(summary.errors).toEqual([]);
    const [call] = update.mock.calls as [{ data: Record<string, unknown> }][];
    const data = call?.[0].data ?? {};
    expect(data['paidAmount']).toBe(332);
    const history = data['syncHistory'] as { action: string; value?: string }[];
    expect(history.at(-1)?.value).toContain('CHF 2.00 mehr als die Rechnung über CHF 330.00');
  });

  it('refuses a file that cannot name the transactions', async () => {
    const { payload, update } = fakePayload();

    await expect(
      importPayments(payload, `Referenz\tBetrag\n${reference}\t330`, 'Finanzen'),
    ).rejects.toThrow(PaymentFileError);
    expect(update).not.toHaveBeenCalled();
  });
});
