jest.mock('@/config/environment-variables', () => ({
  environmentVariables: {
    CEVIDB_GROUP_FULL_ADMIN: [541],
    CEVIDB_GROUP_WEB_CORE_TEAM: [105],
    CEVIDB_GROUP_TRANSLATION_TEAM: [106],
    CEVIDB_GROUP_PROGRAM_TEAM: [107],
    BILLING_ADMIN_GROUP_ID: [900],
  },
}));

import { BillParticipantsCollection } from '@/features/billing/collections/bill-participants';
import type { CollectionBeforeChangeHook } from 'payload';

/** Runs the status rule the way Payload runs it on an update. */
const update = (
  originalDocument: Record<string, unknown>,
  data: Record<string, unknown>,
): unknown => {
  const [statusRule] = (BillParticipantsCollection.hooks?.beforeChange ??
    []) as CollectionBeforeChangeHook[];
  return statusRule?.({
    data,
    originalDoc: originalDocument,
    operation: 'update',
  } as Parameters<CollectionBeforeChangeHook>[0]);
};

const paidRow = { status: 'paid', paymentTransactionReference: 'GS00000000000001' };

describe('a booked payment', () => {
  it('is not replaced by a second import that read the bill while it was still open', () => {
    expect(() =>
      update(paidRow, { status: 'paid', paymentTransactionReference: 'GS00000000000002' }),
    ).toThrow('GS00000000000001');
  });

  it('may be written again with the same transaction', () => {
    expect(() =>
      update(paidRow, { status: 'paid', paymentTransactionReference: 'GS00000000000001' }),
    ).not.toThrow();
  });

  it('does not stop the write-back from recording its outcome on the row', () => {
    expect(() => update(paidRow, { anmeldestatus: 'definitiv', syncHistory: [] })).not.toThrow();
  });

  it('is booked on an open bill', () => {
    expect(() =>
      update(
        { status: 'bill_sent' },
        { status: 'paid', paymentTransactionReference: 'GS00000000000001' },
      ),
    ).not.toThrow();
  });
});
