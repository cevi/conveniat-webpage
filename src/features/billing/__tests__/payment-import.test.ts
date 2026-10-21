// The import only reaches the Cevi.DB client through the queued job, never in the request.
jest.mock('@/features/billing/services/email-service', () => ({
  createHitobitoService: jest.fn(),
}));

// The real package is ESM only; the hooks need nothing of it but the error they throw.
jest.mock('payload', () => ({
  APIError: class extends Error {},
}));

import {
  reconcileAfterPaymentChange,
  validatePaymentChange,
} from '@/features/billing/collections/bill-payment-hooks';
import { importPayments, PaymentFileError } from '@/features/billing/services/payment-import';
import { generateQrReference } from '@/features/billing/utils';
import type { BillPayment } from '@/features/payload-cms/payload-types';
import type { Payload } from 'payload';

const reference = generateQrReference('123012', '34000', '0567000', 1);
const siblingReference = generateQrReference('123012', '34000', '0567000', 2);
const unknownReference = generateQrReference('123012', '34000', '0567000', 3);

const HEADER =
  'Referenz\tBetrag\tWährung\tBuchungsdatum\tZahlungspflichtiger\tTransaktionsreferenz';

/** A bank file with one line per `[reference, amount, transaction]`. */
const bankFile = (...lines: [string, number, string][]): string =>
  [
    HEADER,
    ...lines.map(
      ([lineReference, amount, transaction]) =>
        `${lineReference}\t${String(amount)}\tCHF\t08.10.2026\tLea Muster\t${transaction}`,
    ),
  ].join('\n');

type Document_ = Record<string, unknown> & { id: string };

/** Every value a dotted path reaches, stepping into arrays the way Mongo does. */
const valuesAt = (value: unknown, path: string[]): unknown[] => {
  if (path.length === 0) return Array.isArray(value) ? value : [value];
  if (Array.isArray(value)) return value.flatMap((item) => valuesAt(item, path));
  if (value === null || typeof value !== 'object') return [];
  const [head = '', ...rest] = path;
  return valuesAt((value as Record<string, unknown>)[head], rest);
};

const matchesWhere = (document_: Document_, where: Record<string, unknown>): boolean =>
  Object.entries(where).every(([key, condition]) => {
    if (key === 'or') {
      return (condition as Record<string, unknown>[]).some((part) => matchesWhere(document_, part));
    }
    if (key === 'and') {
      return (condition as Record<string, unknown>[]).every((part) =>
        matchesWhere(document_, part),
      );
    }
    const values = valuesAt(document_, key.split('.'));
    const {
      equals,
      in: within,
      exists,
    } = condition as {
      equals?: unknown;
      in?: unknown[];
      exists?: boolean;
    };
    if (equals !== undefined) return values.includes(equals);
    if (within !== undefined) return values.some((value) => within.includes(value));
    if (exists !== undefined) return values.some((value) => value !== undefined) === exists;
    return true;
  });

/**
 * A Payload double that keeps its documents, so a test can import a file, change an
 * allocation and read back what the bills look like, as the real collections would.
 */
const fakePayload = (
  participants: Document_[],
): {
  payload: Payload;
  queue: jest.Mock;
  participant: (id: string) => Document_;
  payment: (transaction: string) => Document_;
  payments: () => Document_[];
} => {
  const store: Record<string, Document_[]> = {
    'bill-participants': participants.map((document_) => structuredClone(document_)),
    'bill-payments': [],
  };
  let nextId = 1;
  const queue = jest.fn().mockResolvedValue({ id: 'job-1' });

  const payload = {
    find: jest.fn(
      ({ collection, where }: { collection: string; where?: Record<string, unknown> }) => ({
        docs: (store[collection] ?? [])
          .filter((document_) => matchesWhere(document_, where ?? {}))
          .map((document_) => structuredClone(document_)),
      }),
    ),
    findByID: jest.fn(({ collection, id }: { collection: string; id: string }) => {
      const found = store[collection]?.find((document_) => document_.id === id);
      // eslint-disable-next-line unicorn/no-null -- what findByID with disableErrors returns
      return found === undefined ? null : structuredClone(found);
    }),
    create: jest.fn(
      ({ collection, data, depth }: { collection: string; data: Document_; depth?: number }) => {
        const documents = store[collection] ?? [];
        if (
          collection === 'bill-payments' &&
          documents.some(
            (document_) => document_['transactionReference'] === data['transactionReference'],
          )
        ) {
          throw new Error('E11000 duplicate key error');
        }
        const created: Document_ = { ...structuredClone(data), id: `payment-${String(nextId++)}` };
        documents.push(created);
        if (depth === 0) return structuredClone(created);
        // Like Payload, which populates relationships unless told not to.
        return {
          ...structuredClone(created),
          allocations: ((created['allocations'] ?? []) as { participant: string }[]).map(
            (allocation) => ({
              ...allocation,
              participant: structuredClone(
                store['bill-participants']?.find(
                  (document_) => document_.id === allocation.participant,
                ),
              ),
            }),
          ),
        };
      },
    ),
    update: jest.fn(
      ({ collection, id, data }: { collection: string; id: string; data: Document_ }) => {
        const documents = store[collection] ?? [];
        const index = documents.findIndex((document_) => document_.id === id);
        const updated = { ...documents[index], ...structuredClone(data), id };
        documents[index] = updated;
        return structuredClone(updated);
      },
    ),
    jobs: { queue },
    logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
  } as unknown as Payload;

  const byId = (collection: string, predicate: (document_: Document_) => boolean): Document_ => {
    const found = store[collection]?.find((document_) => predicate(document_));
    if (found === undefined) throw new Error(`Nothing in ${collection} matches`);
    return found;
  };

  return {
    payload,
    queue,
    participant: (id) => byId('bill-participants', (document_) => document_.id === id),
    payment: (transaction) =>
      byId('bill-payments', (document_) => document_['transactionReference'] === transaction),
    payments: () => store['bill-payments'] ?? [],
  };
};

const lea = (overrides: Partial<Document_> = {}): Document_ => ({
  id: 'lea',
  fullName: 'Lea Muster',
  status: 'bill_sent',
  referenceNumber: reference,
  invoiceNumber: 'R-2026-00001',
  invoiceAmount: 330,
  issuedBills: [],
  syncHistory: [],
  ...overrides,
});

const noah = (overrides: Partial<Document_> = {}): Document_ => ({
  id: 'noah',
  fullName: 'Noah Muster',
  status: 'bill_sent',
  referenceNumber: siblingReference,
  invoiceNumber: 'R-2026-00002',
  invoiceAmount: 330,
  issuedBills: [],
  syncHistory: [],
  ...overrides,
});

const historyOf = (document_: Document_): { action: string; value?: string }[] =>
  document_['syncHistory'] as { action: string; value?: string }[];

/** Saves a payment the way the admin panel does, through the collection's hooks. */
const editPayment = async (
  fake: ReturnType<typeof fakePayload>,
  transaction: string,
  changes: Partial<BillPayment>,
): Promise<void> => {
  const original = structuredClone(fake.payment(transaction)) as unknown as BillPayment;
  const request = { payload: fake.payload, context: {}, user: { name: 'Mia Finanzen' } };
  const data = (await validatePaymentChange({
    data: structuredClone(changes),
    originalDoc: original,
    operation: 'update',
    req: request,
  } as never)) as Partial<BillPayment>;
  const document_ = { ...original, ...data };
  await fake.payload.update({
    collection: 'bill-payments',
    id: original.id,
    data: document_,
  });
  await reconcileAfterPaymentChange({
    doc: document_,
    previousDoc: original,
    req: request,
  } as never);
};

describe('importPayments', () => {
  it('stores the payment and books the bill it pays', async () => {
    const fake = fakePayload([lea()]);

    const summary = await importPayments(
      fake.payload,
      bankFile([reference, 330, 'GS00000000000001']),
      'Finanzen',
    );

    expect(summary.bookedCount).toBe(1);
    expect(fake.payment('GS00000000000001')).toEqual(
      expect.objectContaining({
        amount: 330,
        bookingDate: '2026-10-08T00:00:00.000Z',
        matchedParticipant: 'lea',
        importOutcome: 'booked',
        allocations: [{ participant: 'lea', amount: 330 }],
      }),
    );
    expect(fake.participant('lea')).toEqual(
      expect.objectContaining({
        status: 'paid',
        paidDate: '2026-10-08T00:00:00.000Z',
        paidAmount: 330,
        paymentTransactionReference: 'GS00000000000001',
      }),
    );
    const booked = historyOf(fake.participant('lea')).at(-1);
    expect(booked?.action).toBe('payment_booked');
    expect(booked?.value).toContain('Transaktion GS00000000000001');
    expect(booked?.value).toContain('importiert von Finanzen');
    expect(fake.queue).toHaveBeenCalledWith({
      task: 'writeBackPayments',
      input: { participantIds: ['lea'] },
    });
  });

  it('notes in the history how much more than the bill was paid', async () => {
    const fake = fakePayload([lea()]);

    const summary = await importPayments(
      fake.payload,
      bankFile([reference, 332, 'GS00000000000001']),
      'Finanzen',
    );

    expect(summary.bookedCount).toBe(1);
    expect(summary.errors).toEqual([]);
    expect(fake.participant('lea')['paidAmount']).toBe(332);
    expect(fake.participant('lea')['doublePayment']).toBeUndefined();
    expect(historyOf(fake.participant('lea')).at(-1)?.value).toContain(
      'CHF 2.00 mehr als die Rechnung über CHF 330.00',
    );
  });

  it('links a second payment from a later file to the paid bill and flags it, leaving it paid', async () => {
    const fake = fakePayload([lea()]);
    await importPayments(fake.payload, bankFile([reference, 330, 'GS00000000000001']), 'Finanzen');

    const summary = await importPayments(
      fake.payload,
      bankFile([reference, 330, 'GS00000000000002']),
      'Finanzen',
    );

    expect(summary.bookedCount).toBe(0);
    expect(summary.outcomes).toEqual({ double_payment: 1 });
    expect(summary.errors).toEqual([expect.stringContaining('Doppelzahlung')]);
    expect(fake.payment('GS00000000000002')['allocations']).toEqual([
      { participant: 'lea', amount: 330 },
    ]);
    expect(fake.participant('lea')).toEqual(
      expect.objectContaining({
        status: 'paid',
        doublePayment: true,
        paymentTransactionReference: 'GS00000000000001',
      }),
    );
    expect(historyOf(fake.participant('lea')).at(-1)).toEqual(
      expect.objectContaining({
        action: 'double_payment_detected',
        value: expect.stringContaining('GS00000000000001, GS00000000000002') as unknown,
      }),
    );
    // The bill was definitiv already: nothing more to tell the Cevi.DB.
    expect(fake.queue).toHaveBeenCalledTimes(1);
  });

  it('books a bill paid twice in one file once, and flags it', async () => {
    const fake = fakePayload([lea()]);

    const summary = await importPayments(
      fake.payload,
      bankFile([reference, 330, 'GS00000000000001'], [reference, 330, 'GS00000000000002']),
      'Finanzen',
    );

    expect(summary.bookedCount).toBe(1);
    expect(fake.participant('lea')).toEqual(
      expect.objectContaining({ status: 'paid', doublePayment: true }),
    );
  });

  it('adds nothing when the same file is imported again', async () => {
    const fake = fakePayload([lea()]);
    const file = bankFile([reference, 330, 'GS00000000000001']);
    await importPayments(fake.payload, file, 'Finanzen');

    const summary = await importPayments(fake.payload, file, 'Finanzen');

    expect(summary.alreadyBookedCount).toBe(1);
    expect(fake.payments()).toHaveLength(1);
    expect(fake.participant('lea')['doublePayment']).toBeUndefined();
  });

  it('keeps a payment it cannot assign, for finance to assign by hand', async () => {
    const fake = fakePayload([lea()]);

    await importPayments(
      fake.payload,
      bankFile([unknownReference, 330, 'GS00000000000001']),
      'Finanzen',
    );

    expect(fake.payment('GS00000000000001')).toEqual(
      expect.objectContaining({ importOutcome: 'unknown_reference', allocations: [] }),
    );
    expect(fake.payment('GS00000000000001')['matchedParticipant']).toBeUndefined();
    expect(fake.participant('lea')['status']).toBe('bill_sent');
  });

  it('stores nothing from a row whose reference a program turned into a number', async () => {
    const fake = fakePayload([lea()]);

    const summary = await importPayments(
      fake.payload,
      bankFile(['-9.2233720368547758e+18', 330, 'GS00000000000001']),
      'Finanzen',
    );

    expect(summary.outcomes).toEqual({ invalid_reference: 1 });
    expect(fake.payments()).toEqual([]);
  });

  it('refuses a file that cannot name the transactions', async () => {
    const fake = fakePayload([lea()]);

    await expect(
      importPayments(fake.payload, `Referenz\tBetrag\n${reference}\t330`, 'Finanzen'),
    ).rejects.toThrow(PaymentFileError);
    expect(fake.payments()).toEqual([]);
  });
});

describe('assigning payments by hand', () => {
  it('moves a double payment to the sibling it was meant for, keeping the reference it came with', async () => {
    // A mother paid both children with the first child's bill, twice.
    const fake = fakePayload([lea(), noah()]);
    await importPayments(
      fake.payload,
      bankFile([reference, 330, 'GS00000000000001'], [reference, 330, 'GS00000000000002']),
      'Finanzen',
    );
    fake.queue.mockClear();

    await editPayment(fake, 'GS00000000000002', {
      allocations: [{ participant: 'noah', amount: 330 }],
    });

    expect(fake.participant('lea')).toEqual(
      expect.objectContaining({ status: 'paid', doublePayment: false }),
    );
    expect(historyOf(fake.participant('lea')).at(-1)).toEqual({
      date: expect.any(String) as unknown,
      action: 'double_payment_resolved',
      value: 'zugeordnet von Mia Finanzen',
    });
    expect(fake.participant('noah')).toEqual(
      expect.objectContaining({
        status: 'paid',
        paidAmount: 330,
        paymentTransactionReference: 'GS00000000000002',
      }),
    );
    expect(historyOf(fake.participant('noah')).at(-1)?.value).toContain(
      'zugeordnet von Mia Finanzen',
    );
    expect(fake.payment('GS00000000000002')['matchedParticipant']).toBe('lea');
    expect(fake.queue).toHaveBeenCalledWith({
      task: 'writeBackPayments',
      input: { participantIds: ['noah'] },
    });
  });

  it('splits one payment for two children across both bills', async () => {
    const fake = fakePayload([lea(), noah()]);
    await importPayments(fake.payload, bankFile([reference, 660, 'GS00000000000001']), 'Finanzen');
    expect(fake.payment('GS00000000000001')['importOutcome']).toBe('amount_mismatch');

    await editPayment(fake, 'GS00000000000001', {
      allocations: [
        { participant: 'lea', amount: 330 },
        { participant: 'noah', amount: 330 },
      ],
    });

    expect(fake.participant('lea')['status']).toBe('paid');
    expect(fake.participant('noah')['status']).toBe('paid');
    expect(fake.participant('noah')['paymentTransactionReference']).toBe('GS00000000000001');
  });

  it('refuses to take the only payment off a paid bill', async () => {
    const fake = fakePayload([lea(), noah()]);
    await importPayments(fake.payload, bankFile([reference, 330, 'GS00000000000001']), 'Finanzen');

    await expect(
      editPayment(fake, 'GS00000000000001', {
        allocations: [{ participant: 'noah', amount: 330 }],
      }),
    ).rejects.toThrow('Lea Muster ist bereits als bezahlt verbucht');
    expect(fake.participant('noah')['status']).toBe('bill_sent');
  });

  it('refuses to assign more than the payment brought in', async () => {
    const fake = fakePayload([lea(), noah()]);
    await importPayments(fake.payload, bankFile([reference, 400, 'GS00000000000001']), 'Finanzen');

    await expect(
      editPayment(fake, 'GS00000000000001', {
        allocations: [
          { participant: 'lea', amount: 330 },
          { participant: 'noah', amount: 330 },
        ],
      }),
    ).rejects.toThrow('die Zahlung beträgt aber nur CHF 400.00');
  });

  it('clears the flag once the double payment is refunded, and the bill stays paid', async () => {
    const fake = fakePayload([lea()]);
    await importPayments(
      fake.payload,
      bankFile([reference, 330, 'GS00000000000001'], [reference, 330, 'GS00000000000002']),
      'Finanzen',
    );

    await editPayment(fake, 'GS00000000000002', { refundedDate: '2026-10-21T00:00:00.000Z' });

    expect(fake.participant('lea')).toEqual(
      expect.objectContaining({ status: 'paid', doublePayment: false }),
    );
  });
});
