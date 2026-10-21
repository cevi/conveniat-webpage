import {
  formatChf,
  OVERPAYMENT_TOLERANCE,
  toRappen,
} from '@/features/billing/services/payment-matching';
import type { BillPayment } from '@/features/payload-cms/payload-types';

/**
 * How much of which payment counts for which bill.
 *
 * A payment is assigned by its allocations, not by its reference: the import allocates it to
 * the bill whose reference it carries, and finance can move it to another bill or split it,
 * as when a mother pays both children's bills with one of the two references. Whatever the
 * allocations say is what a bill counts as paid. A refunded payment counts for nothing.
 *
 * Kept free of Payload runtime imports, so the arithmetic can be tested on its own.
 */

export type AllocatablePayment = Pick<
  BillPayment,
  'transactionReference' | 'amount' | 'bookingDate' | 'refundedDate' | 'allocations'
> & { id?: string };

/** The id a relationship holds, whether Payload returned it populated or not. */
export const relationId = (value: unknown): string | undefined => {
  if (typeof value === 'string' && value !== '') return value;
  if (value !== null && typeof value === 'object') {
    const id = (value as { id?: unknown }).id;
    if (typeof id === 'string' && id !== '') return id;
  }
  return undefined;
};

/** Every bill a payment is allocated to. */
export const allocatedParticipantIds = (
  payment: Pick<BillPayment, 'allocations'> | null | undefined,
): string[] => [
  ...new Set(
    (payment?.allocations ?? [])
      .map((allocation) => relationId(allocation.participant))
      .filter((id) => id !== undefined),
  ),
];

/** Whether a payment still counts, which a refund ends. */
export const isRefunded = (payment: Pick<BillPayment, 'refundedDate'>): boolean =>
  typeof payment.refundedDate === 'string' && payment.refundedDate !== '';

/** The share of one payment allocated to one bill, in Rappen; zero once refunded. */
export const allocatedToParticipant = (
  payment: Pick<BillPayment, 'allocations' | 'refundedDate'>,
  participantId: string,
): number =>
  isRefunded(payment)
    ? 0
    : (payment.allocations ?? [])
        .filter((allocation) => relationId(allocation.participant) === participantId)
        .reduce((sum, allocation) => sum + toRappen(allocation.amount), 0);

/**
 * The payments that count for a bill, oldest booking first. Payments booked the same day go
 * by transaction, so the same payments always settle a bill in the same order.
 */
export const paymentsCountingFor = <T extends AllocatablePayment>(
  payments: T[],
  participantId: string,
): T[] =>
  payments
    .filter((payment) => allocatedToParticipant(payment, participantId) > 0)
    .toSorted((a, b) => {
      const byDate = (a.bookingDate ?? '').localeCompare(b.bookingDate ?? '');
      return byDate === 0 ? a.transactionReference.localeCompare(b.transactionReference) : byDate;
    });

/**
 * The first payments that together pay a bill, oldest first; empty while they fall short.
 *
 * A bill is booked with these, whether the payments after them arrive in the same bank file
 * or a later one: what comes after is the double payment, not part of the booking.
 */
export const settlingPayments = <T extends AllocatablePayment>(
  counting: T[],
  participantId: string,
  invoiceRappen: number,
): T[] => {
  let paid = 0;
  for (const [index, payment] of counting.entries()) {
    paid += allocatedToParticipant(payment, participantId);
    if (paid >= invoiceRappen) return counting.slice(0, index + 1);
  }
  return [];
};

/** What all payments together pay towards a bill, in Rappen. */
export const totalAllocatedTo = (payments: AllocatablePayment[], participantId: string): number =>
  payments.reduce((sum, payment) => sum + allocatedToParticipant(payment, participantId), 0);

/**
 * Whether a bill got more than it asks for, beyond what the import books as rounding.
 *
 * Two payments of the full amount, a second one of any size, or a split that gave one bill
 * too much all read the same: money that has to go back or on to another bill.
 */
export const isDoublePayment = (
  allocatedRappen: number,
  invoiceAmount: number | null | undefined,
): boolean =>
  invoiceAmount !== null &&
  invoiceAmount !== undefined &&
  allocatedRappen - toRappen(invoiceAmount) > toRappen(OVERPAYMENT_TOLERANCE);

/** Why the allocations of a payment cannot be saved, or `undefined` when they can. */
export const describeAllocationProblem = (
  payment: Pick<BillPayment, 'amount' | 'allocations'>,
): string | undefined => {
  const allocations = payment.allocations ?? [];
  if (allocations.some((allocation) => toRappen(allocation.amount) <= 0)) {
    return 'Jede Zuordnung braucht einen Betrag über CHF 0.00.';
  }
  const ids = allocations.map((allocation) => relationId(allocation.participant));
  if (new Set(ids).size !== ids.length) {
    return 'Jede Rechnung darf nur einmal zugeordnet werden. Beträge für dieselbe Rechnung bitte zusammenzählen.';
  }
  const allocated = allocations.reduce((sum, allocation) => sum + toRappen(allocation.amount), 0);
  if (allocated > toRappen(payment.amount)) {
    return (
      `Zugeordnet sind ${formatChf(allocated / 100)}, die Zahlung beträgt aber nur ` +
      `${formatChf(payment.amount)}.`
    );
  }
  return undefined;
};
