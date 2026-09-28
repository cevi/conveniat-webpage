import { recordIssuedBills } from '@/features/billing/collections/record-issued-bills';
import type { BillParticipant } from '@/features/payload-cms/payload-types';

const billed = (overrides: Partial<BillParticipant> = {}): BillParticipant =>
  ({
    id: 'row-1',
    fullName: 'Susanna Beispiel',
    status: 'bill_sent',
    invoiceNumber: '2026-001',
    referenceNumber: '21 00000 00031 39471 430',
    invoiceAmount: 1500,
    billCreatedDate: '2026-05-20T08:00:00.000Z',
    billPdfs: ['pdf-1'],
    syncHistory: [],
    ...overrides,
  }) as unknown as BillParticipant;

const runHook = async (
  originalDocument: BillParticipant,
  data: Partial<BillParticipant>,
  pdfFilenames: string[] = [],
): Promise<Partial<BillParticipant>> => {
  const find = jest.fn().mockResolvedValue({
    docs: pdfFilenames.map((filename, index) => ({ id: `pdf-${String(index)}`, filename })),
  });
  const result: unknown = await recordIssuedBills({
    data,
    originalDoc: originalDocument,
    operation: 'update',
    req: { payload: { find } },
  } as never);
  return result as Partial<BillParticipant>;
};

describe('recordIssuedBills', () => {
  it('keeps the replaced bill when a bill is regenerated', async () => {
    const result = await runHook(
      billed(),
      {
        status: 'bill_created',
        invoiceNumber: '2026-007',
        referenceNumber: '21 00000 00031 39471 437',
        invoiceAmount: 1200,
        billCreatedDate: '2026-06-02T08:00:00.000Z',
      },
      ['Rechnung-2026-001-1779264000000.pdf'],
    );

    expect(result.issuedBills).toEqual([
      expect.objectContaining({
        invoiceNumber: '2026-001',
        invoiceAmount: 1500,
        cancelReason: 'Ersetzt durch Rechnung 2026-007.',
        cancelledDate: expect.any(String) as unknown,
      }),
      {
        invoiceNumber: '2026-007',
        referenceNumber: '21 00000 00031 39471 437',
        invoiceAmount: 1200,
        billCreatedDate: '2026-06-02T08:00:00.000Z',
      },
    ]);
  });

  it('cancels the standing bill with the reason the operator gave for Stornieren', async () => {
    const result = await runHook(billed(), {
      status: 'removed',
      syncHistory: [
        {
          date: '2026-06-10T08:00:00.000Z',
          action: 'manually_removed',
          cancelReason: 'Doppelt angemeldet, bleibt bei Cevi Uster.',
          reviewReason:
            'Storniert durch Hans Muster. Grund: Doppelt angemeldet, bleibt bei Cevi Uster.\n' +
            'Eine allfällige Rechnung bleibt zur Nachvollziehbarkeit erhalten.',
        },
      ],
    });

    expect(result.issuedBills).toEqual([
      expect.objectContaining({
        invoiceNumber: '2026-001',
        cancelReason: 'Doppelt angemeldet, bleibt bei Cevi Uster.',
      }),
    ]);
  });

  it("cancels the standing bill with the sync's note when the Cevi.DB dropped the registration", async () => {
    const result = await runHook(billed(), {
      status: 'removed',
      syncHistory: [
        {
          date: '2026-06-10T08:00:00.000Z',
          action: 'removed_detected',
          reviewReason:
            'Die Anmeldung ist in der Cevi.DB nicht mehr vorhanden. Die Rechnung 2026-001 wurde deshalb storniert.',
        },
      ],
    });

    expect(result.issuedBills?.[0]?.cancelReason).toBe(
      'Die Anmeldung ist in der Cevi.DB nicht mehr vorhanden. Die Rechnung 2026-001 wurde deshalb storniert.',
    );
  });

  it('leaves a bill that was already cancelled alone when a new one replaces it', async () => {
    const result = await runHook(
      billed({
        status: 're_added',
        issuedBills: [
          {
            invoiceNumber: '2026-001',
            cancelledDate: '2026-06-10T08:00:00.000Z',
            cancelReason: 'Anmeldung storniert.',
          },
        ],
      }),
      { status: 'bill_created', invoiceNumber: '2026-009' },
    );

    expect(result.issuedBills?.[0]).toMatchObject({ cancelReason: 'Anmeldung storniert.' });
    expect(result.issuedBills?.[1]).toMatchObject({ invoiceNumber: '2026-009' });
  });

  it('writes nothing for a sync that changes neither the bill nor the status', async () => {
    const result = await runHook(billed(), { status: 'bill_sent', email: 'susanna@example.ch' });

    expect(result).not.toHaveProperty('issuedBills');
  });
});
