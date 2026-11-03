import { formatChf, OVERPAYMENT_TOLERANCE, toRappen } from '@/features/billing-core/money';
import type { BankPayment } from '@/features/billing-core/payment-csv';
import type { PaymentOutcome } from '@/features/billing-core/payment-outcome';
import { isValidQrReference } from '@/features/billing-core/qr-reference';
import {
  formatBillingStatus,
  PAID,
  PAYABLE_STATUSES,
} from '@/features/billing/services/billing-status';
import type { BillParticipant } from '@/features/payload-cms/payload-types';

/**
 * Decides, for every payment in the bank file, which bill it settles, if any.
 *
 * A payment only books a bill when its QR reference matches and it pays at least the bill's
 * amount, and at most `OVERPAYMENT_TOLERANCE` more. Everything else is reported back for the
 * finance team to resolve by hand: guessing at a payment would mark someone paid who is not,
 * and nobody would look at that registration again.
 *
 * Kept free of Payload runtime imports, like `billing-status`, so it can be tested on its own.
 */

export interface PaymentMatch {
  payment: BankPayment;
  outcome: PaymentOutcome;
  /** The registration the reference belongs to, when it belongs to one. */
  participantId?: string;
  /** Why the payment was not booked, in German, naming the payment and the person. */
  message?: string;
}

export type MatchableParticipant = Pick<
  BillParticipant,
  | 'id'
  | 'fullName'
  | 'status'
  | 'referenceNumber'
  | 'invoiceNumber'
  | 'invoiceAmount'
  | 'issuedBills'
  | 'paymentTransactionReference'
>;

/** What a number looks like once Excel has had it: `-9.22337E+18`. */
const SPREADSHEET_NUMBER = /^-?\d+(?:[.,]\d+)?e[+-]?\d+$/i;

/**
 * Whether a reference was turned into a number by whatever saved the file, so the row says
 * nothing about the payment it came from anymore.
 */
export const isConvertedReference = (reference: string): boolean =>
  SPREADSHEET_NUMBER.test(reference) || reference.startsWith('-');

/** Why a reference cannot be matched, or `undefined` when it is a valid QR reference. */
const describeInvalidReference = (reference: string): string | undefined => {
  if (reference === '') {
    return 'Die Zahlung hat keine QR-Referenz. Bitte von Hand zuordnen.';
  }
  if (isConvertedReference(reference)) {
    return (
      `Die Referenz «${reference}» ist keine QR-Referenz mehr, sondern eine umgewandelte Zahl. ` +
      'Das passiert, wenn die Datei in Excel geöffnet und wieder gespeichert wird. ' +
      'Bitte die CSV unverändert aus dem E-Banking hochladen.'
    );
  }
  if (!isValidQrReference(reference)) {
    return `«${reference}» ist keine gültige QR-Referenz (27 Ziffern mit Prüfziffer).`;
  }
  return undefined;
};

/** The participant whose current bill carries this reference, and those whose earlier ones did. */
interface ReferenceIndex {
  current: Map<string, MatchableParticipant>;
  superseded: Map<string, { participant: MatchableParticipant; invoiceNumber: string }>;
}

const indexByReference = (participants: MatchableParticipant[]): ReferenceIndex => {
  const current = new Map<string, MatchableParticipant>();
  const superseded = new Map<
    string,
    { participant: MatchableParticipant; invoiceNumber: string }
  >();
  for (const participant of participants) {
    const reference = participant.referenceNumber?.replaceAll(/\s/g, '') ?? '';
    if (reference !== '') current.set(reference, participant);
    for (const bill of participant.issuedBills ?? []) {
      const issued = bill.referenceNumber?.replaceAll(/\s/g, '') ?? '';
      if (issued !== '' && issued !== reference) {
        superseded.set(issued, { participant, invoiceNumber: bill.invoiceNumber });
      }
    }
  }
  return { current, superseded };
};

/**
 * Matches every payment of the bank file against the bills.
 *
 * @param participants every registration whose current or earlier bill carries one of the
 *   file's references
 * @param knownTransactions the transactions already stored as payments, so a file imported
 *   a second time adds nothing
 */
export function matchPayments(
  payments: BankPayment[],
  participants: MatchableParticipant[],
  knownTransactions: ReadonlySet<string> = new Set(),
): PaymentMatch[] {
  const index = indexByReference(participants);
  // Bills booked earlier in this same file, so a payment listed twice is not booked twice.
  const bookedInFile = new Map<string, BankPayment>();

  return payments.map((payment): PaymentMatch => {
    const prefix = `Zeile ${String(payment.line)}${payment.payer === '' ? '' : ` (${payment.payer})`}, ${formatChf(payment.amount)}`;
    const reject = (
      outcome: PaymentOutcome,
      reason: string,
      participant?: MatchableParticipant,
    ): PaymentMatch => ({
      payment,
      outcome,
      message: `${prefix}: ${reason}`,
      ...(participant === undefined ? {} : { participantId: participant.id }),
    });

    if (
      payment.transactionReference !== '' &&
      knownTransactions.has(payment.transactionReference)
    ) {
      return reject(
        'already_booked',
        `Transaktion ${payment.transactionReference}: bereits importiert.`,
      );
    }

    const invalidReference = describeInvalidReference(payment.reference);
    if (invalidReference !== undefined) return reject('invalid_reference', invalidReference);

    if (payment.transactionReference === '') {
      return reject(
        'missing_transaction_reference',
        'Die Zahlung hat keine Transaktionsreferenz und kann deshalb nicht nachvollziehbar verbucht werden. Bitte von Hand zuordnen.',
      );
    }
    if (payment.amount === undefined || payment.amount <= 0) {
      return reject('invalid_amount', 'Der Betrag ist keine Gutschrift und wurde nicht verbucht.');
    }
    if (payment.currency !== '' && payment.currency !== 'CHF') {
      return reject(
        'wrong_currency',
        `Die Zahlung ist in ${payment.currency}, die Rechnungen lauten auf CHF.`,
      );
    }

    const participant = index.current.get(payment.reference);
    if (participant === undefined) {
      const earlier = index.superseded.get(payment.reference);
      if (earlier !== undefined) {
        return reject(
          'superseded_bill',
          `Die Referenz gehört zur Rechnung ${earlier.invoiceNumber} von ${earlier.participant.fullName}, ` +
            'die inzwischen ersetzt oder storniert wurde. Bitte von Hand zuordnen.',
          earlier.participant,
        );
      }
      return reject('unknown_reference', 'Zu dieser Referenz gibt es keine Rechnung.');
    }

    const who = `${participant.fullName}, Rechnung ${participant.invoiceNumber ?? '–'}`;
    const earlierInFile = bookedInFile.get(participant.id);
    // Checked before the status, so a file imported again after a cancellation still reads
    // as already booked rather than as a fresh payment to refund.
    if (
      payment.transactionReference === participant.paymentTransactionReference ||
      payment.transactionReference === earlierInFile?.transactionReference
    ) {
      return reject('already_booked', `${who}: bereits verbucht.`, participant);
    }
    if (participant.status === PAID || earlierInFile !== undefined) {
      return reject(
        'double_payment',
        `${who} ist bereits bezahlt. Die Zahlung ist als Doppelzahlung bei der Anmeldung ` +
          'hinterlegt: bitte zurückerstatten oder unter «Zahlungen» einer anderen Rechnung zuordnen.',
        participant,
      );
    }

    if (participant.status === 'removed') {
      return reject(
        'cancelled',
        `${who}: Die Anmeldung ist storniert. Bitte prüfen, ob die Zahlung zurückerstattet wird.`,
        participant,
      );
    }
    if (!(PAYABLE_STATUSES as readonly string[]).includes(participant.status)) {
      return reject(
        'not_payable',
        `${who}: Die Anmeldung steht auf «${formatBillingStatus(participant.status)}», ` +
          'es gibt keine offene Rechnung.',
        participant,
      );
    }

    const invoiceAmount = participant.invoiceAmount;
    const overpaidRappen =
      invoiceAmount === null || invoiceAmount === undefined
        ? undefined
        : toRappen(payment.amount) - toRappen(invoiceAmount);
    if (
      overpaidRappen === undefined ||
      overpaidRappen < 0 ||
      overpaidRappen > toRappen(OVERPAYMENT_TOLERANCE)
    ) {
      return reject(
        'amount_mismatch',
        `${who} lautet auf ${formatChf(invoiceAmount)}, bezahlt wurden ${formatChf(payment.amount)}. ` +
          'Bitte von Hand verbuchen.',
        participant,
      );
    }

    bookedInFile.set(participant.id, payment);
    return { payment, outcome: 'booked', participantId: participant.id };
  });
}
