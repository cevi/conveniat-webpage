import { PAYMENT_BOOKED_ACTION } from '@/features/billing/services/anmeldestatus-writeback';
import { PAID, PAYABLE_STATUSES } from '@/features/billing/services/billing-status';
import type { AllocatablePayment } from '@/features/billing/services/payment-allocation';
import {
  isDoublePayment,
  paymentsCountingFor,
  totalAllocatedTo,
} from '@/features/billing/services/payment-allocation';
import { formatChf, toRappen } from '@/features/billing/services/payment-matching';
import { BillingTaskSlug } from '@/features/billing/types';
import type { BillParticipant, BillPayment } from '@/features/payload-cms/payload-types';
import type { Payload } from 'payload';

/**
 * Brings a bill in line with the payments allocated to it.
 *
 * The one place that turns allocations into a paid bill and a double payment flag, for the
 * import and for an allocation finance changes by hand alike, so both book the same way.
 */

export const DOUBLE_PAYMENT_DETECTED_ACTION = 'double_payment_detected';
export const DOUBLE_PAYMENT_RESOLVED_ACTION = 'double_payment_resolved';

/** The input of the `writeBackPayments` task. */
export interface WriteBackPaymentsInput {
  participantIds: string[];
}

/** Who changed the allocations, and how, for the bill's history. */
export interface BookingSource {
  actor: string;
  verb: 'importiert' | 'zugeordnet';
}

export interface ReconcileResult {
  /** Bills this run marked paid, whose Cevi.DB registration still has to follow. */
  bookedIds: string[];
  errors: string[];
}

interface SyncHistoryEntry {
  date: string;
  action: string;
  value?: string;
  reviewReason?: string;
}

type BookedPayment = AllocatablePayment & Pick<BillPayment, 'transactionReference'>;

const formatSwissDate = (isoDate: string): string => {
  const [year, month, day] = isoDate.slice(0, 10).split('-');
  return `${day ?? ''}.${month ?? ''}.${year ?? ''}`;
};

/**
 * `CHF 173.00, CHF 0.04 mehr als die Rechnung über CHF 172.96, gebucht am 19.10.2026,
 * Transaktion GS…, importiert von …`, for the bill's history.
 */
export const describeBooking = (
  payments: BookedPayment[],
  allocatedRappen: number,
  invoiceAmount: number | null | undefined,
  source: BookingSource,
): string => {
  const overpaid =
    invoiceAmount === null || invoiceAmount === undefined
      ? 0
      : allocatedRappen - toRappen(invoiceAmount);
  const [only] = payments;
  return [
    formatChf(allocatedRappen / 100),
    overpaid > 0
      ? `${formatChf(overpaid / 100)} mehr als die Rechnung über ${formatChf(invoiceAmount)}`
      : undefined,
    ...(payments.length === 1 && only !== undefined
      ? [
          typeof only.bookingDate === 'string' && only.bookingDate !== ''
            ? `gebucht am ${formatSwissDate(only.bookingDate)}`
            : undefined,
          `Transaktion ${only.transactionReference}`,
        ]
      : [
          `aus ${String(payments.length)} Zahlungen (Transaktionen ${payments.map((payment) => payment.transactionReference).join(', ')})`,
        ]),
    `${source.verb} von ${source.actor}`,
  ]
    .filter((part) => part !== undefined)
    .join(', ');
};

/** Every payment allocated to a bill, refunded or not. */
export async function findPaymentsAllocatedTo(
  payload: Payload,
  participantId: string,
): Promise<BillPayment[]> {
  const found = await payload.find({
    collection: 'bill-payments',
    where: { 'allocations.participant': { equals: participantId } },
    pagination: false,
    depth: 0,
    context: { internal: true },
  });
  return found.docs;
}

/**
 * Books every bill whose allocations now pay it, and flags or clears a double payment.
 *
 * A paid bill is never unbooked here: the Cevi.DB has it as definitiv by then, and the
 * collection refuses an allocation change that would leave it short.
 *
 * @param justSaved payments written in this request, used in place of what a read returns,
 *   which might not include them yet
 */
export async function reconcileParticipantPayments(
  payload: Payload,
  participantIds: Iterable<string>,
  source: BookingSource,
  justSaved: BillPayment[] = [],
): Promise<ReconcileResult> {
  const result: ReconcileResult = { bookedIds: [], errors: [] };

  for (const id of new Set(participantIds)) {
    const participant = await payload.findByID({
      collection: 'bill-participants',
      id,
      depth: 0,
      disableErrors: true,
      context: { internal: true },
    });
    if (participant === null) continue;

    const stored = await findPaymentsAllocatedTo(payload, id);
    const payments = [
      ...stored.filter((payment) => !justSaved.some((saved) => saved.id === payment.id)),
      ...justSaved,
    ];
    const counting = paymentsCountingFor(payments, id);
    const allocated = totalAllocatedTo(payments, id);
    const invoiceAmount = participant.invoiceAmount;
    const now = new Date().toISOString();
    const history = Array.isArray(participant.syncHistory)
      ? [...(participant.syncHistory as SyncHistoryEntry[])]
      : [];
    const data: Partial<BillParticipant> = {};

    const settles =
      (PAYABLE_STATUSES as readonly string[]).includes(participant.status) &&
      invoiceAmount !== null &&
      invoiceAmount !== undefined &&
      allocated >= toRappen(invoiceAmount);
    const last = counting.at(-1);
    if (settles && last !== undefined) {
      data.status = PAID;
      data.paidDate = last.bookingDate ?? now;
      data.paidAmount = allocated / 100;
      data.paymentTransactionReference = (counting[0] ?? last).transactionReference;
      history.push({
        date: now,
        action: PAYMENT_BOOKED_ACTION,
        value: describeBooking(counting, allocated, invoiceAmount, source),
      });
    }

    const flagged = isDoublePayment(allocated, invoiceAmount);
    if (flagged !== (participant.doublePayment === true)) {
      data.doublePayment = flagged;
      history.push(
        flagged
          ? {
              date: now,
              action: DOUBLE_PAYMENT_DETECTED_ACTION,
              value:
                `${formatChf(allocated / 100)} erhalten für die Rechnung über ${formatChf(invoiceAmount)}, ` +
                `Transaktionen ${counting.map((payment) => payment.transactionReference).join(', ')}`,
            }
          : {
              date: now,
              action: DOUBLE_PAYMENT_RESOLVED_ACTION,
              value: `${source.verb} von ${source.actor}`,
            },
      );
    }

    if (Object.keys(data).length === 0) continue;

    try {
      await payload.update({
        collection: 'bill-participants',
        id,
        context: { internal: true },
        data: { ...data, syncHistory: history },
      });
      if (data.status === PAID) result.bookedIds.push(id);
    } catch (error) {
      // The status rule refuses the write when the row moved on since it was read, e.g. a
      // cancellation in the same moment. The payment then needs a human like any other.
      const reason = error instanceof Error ? error.message : String(error);
      payload.logger.warn(
        `Could not bring bill participant ${id} in line with its payments: ${reason}`,
      );
      result.errors.push(`${participant.fullName}: konnte nicht verbucht werden – ${reason}`);
    }
  }

  return result;
}

/**
 * Queues the Cevi.DB write-back for bills just marked paid.
 *
 * @returns why it could not be queued, for the operator; the nightly sync catches up
 */
export async function queuePaymentWriteBack(
  payload: Payload,
  participantIds: string[],
): Promise<string | undefined> {
  if (participantIds.length === 0) return undefined;
  try {
    await payload.jobs.queue({
      task: BillingTaskSlug.WriteBackPayments,
      input: { participantIds } satisfies WriteBackPaymentsInput,
    });
    return undefined;
  } catch (error) {
    payload.logger.error(
      { err: error },
      `Booked ${String(participantIds.length)} payments but could not queue the Cevi.DB write-back.`,
    );
    return (
      'Die Zahlungen sind verbucht, die Cevi.DB konnte aber nicht sofort nachgeführt werden. ' +
      'Das holt der nächste nächtliche Abgleich nach.'
    );
  }
}
