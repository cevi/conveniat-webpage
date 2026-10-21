import { writeBackPayment } from '@/features/billing/services/anmeldestatus-writeback';
import { PAID } from '@/features/billing/services/billing-status';
import { createHitobitoService } from '@/features/billing/services/email-service';
import { allocatedParticipantIds } from '@/features/billing/services/payment-allocation';
import {
  queuePaymentWriteBack,
  reconcileParticipantPayments,
} from '@/features/billing/services/payment-booking';
import { parsePaymentCsv } from '@/features/billing/services/payment-csv';
import type { PaymentMatch, PaymentOutcome } from '@/features/billing/services/payment-matching';
import {
  isConvertedReference,
  isValidQrReference,
  matchPayments,
} from '@/features/billing/services/payment-matching';
import type { BillParticipant, BillPayment } from '@/features/payload-cms/payload-types';
import type { Payload } from 'payload';

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

/** The outcomes whose payment goes to the bill its reference named. */
const ALLOCATED_OUTCOMES: ReadonlySet<PaymentOutcome> = new Set(['booked', 'double_payment']);

/**
 * Whether a payment is worth keeping as a row. One without a transaction id could never be
 * told apart from a second import of it, a debit is no payment, and a reference a spreadsheet
 * turned into a number says the row is no longer what the bank sent.
 */
const isStorable = ({ payment, outcome }: PaymentMatch): boolean =>
  outcome !== 'already_booked' &&
  payment.transactionReference !== '' &&
  payment.amount !== undefined &&
  payment.amount > 0 &&
  !isConvertedReference(payment.reference);

const toPaymentRow = (
  { payment, outcome, participantId, message }: PaymentMatch,
  actor: string,
): Omit<BillPayment, 'id' | 'createdAt' | 'updatedAt'> => ({
  transactionReference: payment.transactionReference,
  amount: payment.amount ?? 0,
  currency: payment.currency === '' ? 'CHF' : payment.currency,
  ...(payment.bookingDate === undefined
    ? {}
    : { bookingDate: `${payment.bookingDate}T00:00:00.000Z` }),
  reference: payment.reference,
  payer: payment.payer,
  message: payment.message,
  ...(participantId === undefined ? {} : { matchedParticipant: participantId }),
  importOutcome: outcome,
  importedBy: actor,
  ...(message === undefined ? {} : { importMessage: message }),
  allocations:
    ALLOCATED_OUTCOMES.has(outcome) && participantId !== undefined
      ? [{ participant: participantId, amount: payment.amount ?? 0 }]
      : [],
});

/**
 * Stores the payments of a bank CSV, books the bills they pay, and queues the Cevi.DB
 * write-back.
 *
 * Every payment becomes a row, booked or not, so one the import could not assign waits for
 * finance in «Zahlungen». A second payment for a bill already paid is linked to that bill and
 * flags it as paid twice. A transaction already stored is skipped, which is what makes
 * importing the same file again harmless.
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
      joins: false,
      context: { internal: true },
    });
    candidates.push(...found.docs);
  }

  const transactions = [
    ...new Set(
      parsed.payments
        .map((payment) => payment.transactionReference)
        .filter((transaction) => transaction !== ''),
    ),
  ];
  const known = await payload.find({
    collection: 'bill-payments',
    where: { transactionReference: { in: transactions } },
    pagination: false,
    depth: 0,
    context: { internal: true },
  });
  const knownTransactions = new Set(known.docs.map((payment) => payment.transactionReference));

  const matches = matchPayments(parsed.payments, candidates, knownTransactions);
  const summary: PaymentImportSummary = {
    totalCount: matches.length,
    bookedCount: 0,
    alreadyBookedCount: 0,
    errors: [],
    outcomes: {},
  };
  const saved: BillPayment[] = [];
  const affected = new Set<string>();

  for (const match of matches) {
    summary.outcomes[match.outcome] = (summary.outcomes[match.outcome] ?? 0) + 1;
    if (match.outcome === 'already_booked') summary.alreadyBookedCount++;
    else if (match.message !== undefined) summary.errors.push(match.message);
    if (!isStorable(match) || knownTransactions.has(match.payment.transactionReference)) continue;

    try {
      const row = await payload.create({
        collection: 'bill-payments',
        depth: 0,
        // The bills are brought in line below, all at once, rather than once per row.
        context: { internal: true, paymentImport: true },
        data: toPaymentRow(match, actor),
      });
      knownTransactions.add(row.transactionReference);
      saved.push(row);
      for (const id of allocatedParticipantIds(row)) affected.add(id);
    } catch (error) {
      // Another import of the same file in the same moment stored the transaction first.
      const reason = error instanceof Error ? error.message : String(error);
      payload.logger.warn(
        `Payment import could not store transaction ${match.payment.transactionReference} from line ${String(match.payment.line)}: ${reason}`,
      );
      summary.errors.push(
        `Zeile ${String(match.payment.line)}: Transaktion ${match.payment.transactionReference} konnte nicht gespeichert werden – ${reason}`,
      );
    }
  }

  const reconciled = await reconcileParticipantPayments(
    payload,
    affected,
    { actor, verb: 'importiert' },
    saved,
  );
  summary.bookedCount = reconciled.bookedIds.length;
  summary.errors.push(...reconciled.errors);
  const writeBackError = await queuePaymentWriteBack(payload, reconciled.bookedIds);
  if (writeBackError !== undefined) summary.errors.push(writeBackError);

  payload.logger.info(
    `Payment import by ${actor}: ${String(summary.totalCount)} payments, ${String(summary.bookedCount)} booked, ` +
      `${String(summary.outcomes.double_payment ?? 0)} double payments, ` +
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
