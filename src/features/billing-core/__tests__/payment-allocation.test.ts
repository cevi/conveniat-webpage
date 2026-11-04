// The ledger's access rules read the group settings; no group matters here.
jest.mock('@/config/environment-variables', () => ({ environmentVariables: {} }));
jest.mock('payload', () => ({ APIError: class extends Error {} }));

import { syncLegacyBillFields } from '@/features/billing-core/bill-payments-collection';
import {
  allocatedBillIds,
  allocatedTo,
  describeAllocationProblem,
  matchedBillOf,
} from '@/features/billing-core/payment-allocation';
import type { BillPayment } from '@/features/payload-cms/payload-types';

type Allocation = NonNullable<BillPayment['allocations']>[number];

const camp = (id: string): Allocation['bill'] => ({ relationTo: 'bill-participants', value: id });
/** A Besuchstag bill, before its collection is part of the generated types. */
const visit = (id: string): Allocation['bill'] =>
  ({ relationTo: 'visit-day-bills', value: id }) as unknown as Allocation['bill'];

/** An allocation as the previous release stored it, naming a camp bill only in `participant`. */
const legacy = (id: string, amount: number): Allocation =>
  ({ participant: id, amount }) as unknown as Allocation;

describe('allocations', () => {
  it('reads the bill of a payment stored before there were two kinds of bill', () => {
    const payment = { allocations: [legacy('lea', 330)] };

    expect(allocatedBillIds(payment, 'bill-participants')).toEqual(['lea']);
    expect(allocatedTo(payment, 'lea')).toBe(33_000);
    expect(matchedBillOf({ matchedParticipant: 'lea' })).toEqual({
      relationTo: 'bill-participants',
      id: 'lea',
    });
  });

  it('tells the bills of one kind from the others in one payment', () => {
    const payment = {
      allocations: [
        { bill: camp('lea'), amount: 300 },
        { bill: visit('anna'), amount: 50 },
      ],
    };

    expect(allocatedBillIds(payment, 'bill-participants')).toEqual(['lea']);
    expect(allocatedBillIds(payment, 'visit-day-bills')).toEqual(['anna']);
    expect(allocatedBillIds(payment)).toEqual(['lea', 'anna']);
  });

  it('prefers `bill` over a legacy `participant` that an edit left behind', () => {
    const payment = { allocations: [{ bill: camp('noah'), participant: 'lea', amount: 330 }] };

    expect(allocatedBillIds(payment)).toEqual(['noah']);
  });

  it('refuses the same bill twice, also when one allocation is legacy', () => {
    expect(
      describeAllocationProblem({
        amount: 660,
        allocations: [legacy('lea', 330), { bill: camp('lea'), amount: 330 }],
      }),
    ).toContain('nur einmal');
  });
});

const sync = (data: Partial<BillPayment>): Partial<BillPayment> =>
  syncLegacyBillFields({ data, operation: 'update' } as never) as Partial<BillPayment>;

describe('syncLegacyBillFields', () => {
  it('fills `bill` from the legacy field, so an older payment can be saved', () => {
    expect(sync({ allocations: [legacy('lea', 330)] }).allocations).toEqual([
      { bill: camp('lea'), participant: 'lea', amount: 330 },
    ]);
  });

  it('keeps the legacy field on the camp bill an allocation now names, for the previous release', () => {
    const synced = sync({ allocations: [{ bill: camp('noah'), participant: 'lea', amount: 330 }] });

    expect(synced.allocations?.[0]?.participant).toBe('noah');
  });

  it('empties the legacy field for a bill of another kind', () => {
    const synced = sync({
      allocations: [{ bill: visit('anna'), participant: 'lea', amount: 50 }],
      matchedBill: visit('anna'),
      matchedParticipant: 'lea',
    });

    expect(synced.allocations?.[0]?.participant).toBeNull();
    expect(synced.matchedParticipant).toBeNull();
  });

  it('fills `matchedBill` from the legacy field', () => {
    expect(sync({ matchedParticipant: 'lea' }).matchedBill).toEqual(camp('lea'));
  });
});
