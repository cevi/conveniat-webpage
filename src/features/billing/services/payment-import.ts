import {
  PAYMENT_BOOKED_ACTION,
  writeBackPayment,
} from '@/features/billing/services/anmeldestatus-writeback';
import { PAID } from '@/features/billing/services/billing-status';
import { createHitobitoService } from '@/features/billing/services/email-service';
import type { BankPayment } from '@/features/billing/services/payment-csv';
import { parsePaymentCsv } from '@/features/billing/services/payment-csv';
import type { PaymentOutcome } from '@/features/billing/services/payment-matching';
import {
  formatChf,
  isValidQrReference,
  matchPayments,
} from '@/features/billing/services/payment-matching';
import { BillingTaskSlug } from '@/features/billing/types';
import type { BillParticipant } from '@/features/payload-cms/payload-types';
import type { Payload } from 'payload';

/** The input of the `writeBackPayments` task. */
export interface WriteBackPaymentsInput {
  participantIds: string[];
}

/** What an import did, for the admin panel to report. */
export interface PaymentImportSummary {
  totalCount: number;
  bookedCount: number;
  /** Payments booked by an earlier import of the same file. */
  alreadyBookedCount: number;
  /** Payments not booked, each with why, for the finance team to resolve by hand. */
  errors: string[];
  /** How many payments ended in each outcome. */
  outcomes: Partial<Record<PaymentOutcome, number>>;
}

/** Refused before anything was booked, because the file cannot be read as a payment list. */
export class PaymentFileError extends Error {}

interface SyncHistoryEntry {
  date: string;
  action: string;
  value?: string;
  reviewReason?: string;
}

const formatSwissDate = (isoDate: string): string => {
  const [year, month, day] = isoDate.split('-');
  return `${day ?? ''}.${month ?? ''}.${year ?? ''}`;
};

/** `CHF 0.04 mehr als die Rechnung über CHF 172.96`, for a payment above the bill's amount. */
const describeOverpayment = (
  payment: BankPayment,
  invoiceAmount: number | null | undefined,
): string | undefined => {
  if (payment.amount === undefined || invoiceAmount === null || invoiceAmount === undefined) {
    return undefined;
  }
  const overpaid = Math.round((payment.amount - invoiceAmount) * 100) / 100;
  return overpaid > 0
    ? `${formatChf(overpaid)} mehr als die Rechnung über ${formatChf(invoiceAmount)}`
    : undefined;
};

const describePayment = (
  payment: BankPayment,
  invoiceAmount: number | null | undefined,
  actor: string,
): string =>
  [
    formatChf(payment.amount),
    describeOverpayment(payment, invoiceAmount),
    payment.bookingDate === undefined
      ? undefined
      : `gebucht am ${formatSwissDate(payment.bookingDate)}`,
    payment.transactionReference === '' ? undefined : `Transaktion ${payment.transactionReference}`,
    `importiert von ${actor}`,
  ]
    .filter((part) => part !== undefined)
    .join(', ');

/**
 * Books the payments of a bank CSV against the bills and queues the Cevi.DB write-back.
 *
 * Booking is done here, in the request, so the operator sees at once what was booked and
 * what was not. Writing to the Cevi.DB takes a few seconds per registration and runs as a
 * background job; a write that fails there is retried by the nightly sync.
 *
 * @param actor who imported the file, for each booked registration's history
 */
export async function importPayments(
  payload: Payload,
  csv: string,
  actor: string,
): Promise<PaymentImportSummary> {
  const parsed = parsePaymentCsv(csv);
  if (parsed.error !== undefined) throw new PaymentFileError(parsed.error);
  if (parsed.payments.length === 0) {
    throw new PaymentFileError('Die Datei enthält keine Zahlungen.');
  }

  const references = [
    ...new Set(
      parsed.payments
        .map((payment) => payment.reference)
        .filter((reference) => isValidQrReference(reference)),
    ),
  ];
  const candidates: BillParticipant[] = [];
  if (references.length > 0) {
    const found = await payload.find({
      collection: 'bill-participants',
      where: {
        or: [
          { referenceNumber: { in: references } },
          { 'issuedBills.referenceNumber': { in: references } },
        ],
      },
      pagination: false,
      depth: 0,
      context: { internal: true },
    });
    candidates.push(...found.docs);
  }

  const matches = matchPayments(parsed.payments, candidates);
  const now = new Date().toISOString();
  const summary: PaymentImportSummary = {
    totalCount: matches.length,
    bookedCount: 0,
    alreadyBookedCount: 0,
    errors: [],
    outcomes: {},
  };
  const bookedIds: string[] = [];

  for (const match of matches) {
    if (match.outcome !== 'booked' || match.participantId === undefined) {
      summary.outcomes[match.outcome] = (summary.outcomes[match.outcome] ?? 0) + 1;
      if (match.outcome === 'already_booked') summary.alreadyBookedCount++;
      else if (match.message !== undefined) summary.errors.push(match.message);
      continue;
    }

    const participant = candidates.find((candidate) => candidate.id === match.participantId);
    const history = Array.isArray(participant?.syncHistory)
      ? (participant.syncHistory as SyncHistoryEntry[])
      : [];
    const { payment } = match;

    try {
      await payload.update({
        collection: 'bill-participants',
        id: match.participantId,
        context: { internal: true },
        data: {
          status: PAID,
          paidDate:
            payment.bookingDate === undefined ? now : `${payment.bookingDate}T00:00:00.000Z`,
          ...(payment.amount === undefined ? {} : { paidAmount: payment.amount }),
          paymentTransactionReference: payment.transactionReference,
          syncHistory: [
            ...history,
            {
              date: now,
              action: PAYMENT_BOOKED_ACTION,
              value: describePayment(payment, participant?.invoiceAmount, actor),
            },
          ],
        },
      });
      bookedIds.push(match.participantId);
      summary.bookedCount++;
      summary.outcomes.booked = (summary.outcomes.booked ?? 0) + 1;
    } catch (error) {
      // The status rule refuses the write when the row moved on since it was read, e.g. a
      // cancellation in the same moment. The payment then needs a human like any other.
      const reason = error instanceof Error ? error.message : String(error);
      payload.logger.warn(
        `Payment import could not book line ${String(payment.line)} on bill participant ${match.participantId}: ${reason}`,
      );
      summary.errors.push(
        `Zeile ${String(payment.line)}, ${formatChf(payment.amount)}: konnte nicht verbucht werden – ${reason}`,
      );
    }
  }

  if (bookedIds.length > 0) {
    try {
      await payload.jobs.queue({
        task: BillingTaskSlug.WriteBackPayments,
        input: { participantIds: bookedIds } satisfies WriteBackPaymentsInput,
      });
    } catch (error) {
      payload.logger.error(
        { err: error },
        `Payment import booked ${String(bookedIds.length)} payments but could not queue the Cevi.DB write-back.`,
      );
      summary.errors.push(
        'Die Zahlungen sind verbucht, die Cevi.DB konnte aber nicht sofort nachgeführt werden. ' +
          'Das holt der nächste nächtliche Abgleich nach.',
      );
    }
  }

  payload.logger.info(
    `Payment import by ${actor}: ${String(summary.totalCount)} payments, ${String(summary.bookedCount)} booked, ` +
      `${String(summary.alreadyBookedCount)} already booked, ${String(summary.errors.length)} for manual review.`,
  );
  return summary;
}

/** What the background write-back did. */
export interface WriteBackPaymentsSummary {
  writtenCount: number;
  errors: string[];
}

/**
 * Marks the registrations just booked as paid in the Cevi.DB, one at a time.
 *
 * Each row is re-read, so a registration cancelled since the import is left alone, and the
 * outcome is recorded in its history like the invoice write-back's.
 */
export async function writeBackPayments(
  payload: Payload,
  participantIds: string[],
): Promise<WriteBackPaymentsSummary> {
  const hitobitoService = await createHitobitoService(payload);
  const logger = {
    warn: (message: string): void => payload.logger.warn(message),
    debug: (message: string): void => payload.logger.debug(message),
  };
  const summary: WriteBackPaymentsSummary = { writtenCount: 0, errors: [] };

  for (const id of participantIds) {
    const participant = await payload.findByID({
      collection: 'bill-participants',
      id,
      depth: 0,
      disableErrors: true,
      context: { internal: true },
    });
    if (participant?.status !== PAID) continue;

    const now = new Date().toISOString();
    const result = await writeBackPayment(
      hitobitoService,
      {
        groupId: participant.groupId ?? '',
        eventId: participant.eventId,
        participationUuid: participant.participationUuid,
        fullName: participant.fullName,
        anmeldestatus: participant.anmeldestatus,
      },
      now,
      logger,
    );

    if (result.error === undefined) summary.writtenCount++;
    else summary.errors.push(result.error);

    if (result.historyEntries.length > 0 || result.anmeldestatus !== participant.anmeldestatus) {
      const history = Array.isArray(participant.syncHistory)
        ? (participant.syncHistory as SyncHistoryEntry[])
        : [];
      await payload.update({
        collection: 'bill-participants',
        id,
        context: { internal: true },
        data: {
          ...(result.anmeldestatus === undefined ? {} : { anmeldestatus: result.anmeldestatus }),
          syncHistory: [...history, ...result.historyEntries],
        },
      });
    }
  }

  payload.logger.info(
    `Payment write-back to Cevi.DB: ${String(summary.writtenCount)} of ${String(participantIds.length)} written, ${String(summary.errors.length)} failed.`,
  );
  return summary;
}
