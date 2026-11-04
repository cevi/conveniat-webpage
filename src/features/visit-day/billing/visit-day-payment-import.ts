import type { PaymentImporter, PaymentImportSummary } from '@/features/billing-core/bank-import';
import { formatChf, OVERPAYMENT_TOLERANCE, toRappen } from '@/features/billing-core/money';
import { allocatedBillIds } from '@/features/billing-core/payment-allocation';
import type { BankPayment } from '@/features/billing-core/payment-csv';
import type { PaymentOutcome } from '@/features/billing-core/payment-outcome';
import { BILL_REFERENCE_PREFIXES, isValidQrReference } from '@/features/billing-core/qr-reference';
import type { BillPayment, VisitDayBill } from '@/features/payload-cms/payload-types';
import {
  reconcileVisitDayBills,
  VISIT_DAY_BILL_COLLECTION,
} from '@/features/visit-day/billing/visit-day-bill-booking';
import type { Payload } from 'payload';

export type MatchableVisitDayBill = Pick<
  VisitDayBill,
  | 'id'
  | 'registrationNumber'
  | 'fullName'
  | 'status'
  | 'referenceNumber'
  | 'invoiceNumber'
  | 'invoiceAmount'
  | 'issuedBills'
  | 'paymentTransactionReference'
>;

export interface VisitDayPaymentMatch {
  payment: BankPayment;
  outcome: PaymentOutcome;
  billId?: string;
  message?: string;
}

/** The outcomes whose payment goes to the bill its reference named. */
const ALLOCATED_OUTCOMES: ReadonlySet<PaymentOutcome> = new Set(['booked', 'double_payment']);

/** Whether a payment is a Besuchstag payment: a valid QR reference starting with `091`. */
export const isVisitDayPayment = (payment: Pick<BankPayment, 'reference'>): boolean =>
  payment.reference.startsWith(BILL_REFERENCE_PREFIXES.visitDay) &&
  isValidQrReference(payment.reference);

/**
 * Decides, for each Besuchstag payment of a bank file, which bill it settles. Books only what
 * pays an open bill in full, at most `OVERPAYMENT_TOLERANCE` more; a payment on a paid bill is
 * kept with it as a double payment, everything else waits for finance, as on the camp bills.
 */
export function matchVisitDayPayments(
  payments: BankPayment[],
  bills: MatchableVisitDayBill[],
  knownTransactions: ReadonlySet<string>,
): VisitDayPaymentMatch[] {
  const current = new Map<string, MatchableVisitDayBill>();
  const superseded = new Map<string, MatchableVisitDayBill>();
  for (const bill of bills) {
    current.set(bill.referenceNumber, bill);
    for (const issued of bill.issuedBills ?? []) {
      if (issued.referenceNumber !== bill.referenceNumber) {
        superseded.set(issued.referenceNumber, bill);
      }
    }
  }
  const bookedInFile = new Set<string>();

  return payments.map((payment): VisitDayPaymentMatch => {
    const prefix = `Zeile ${String(payment.line)}${payment.payer === '' ? '' : ` (${payment.payer})`}, ${formatChf(payment.amount)}`;
    const reject = (
      outcome: PaymentOutcome,
      reason: string,
      bill?: MatchableVisitDayBill,
    ): VisitDayPaymentMatch => ({
      payment,
      outcome,
      message: `${prefix}: ${reason}`,
      ...(bill === undefined ? {} : { billId: bill.id }),
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
    if (payment.transactionReference === '') {
      return reject(
        'missing_transaction_reference',
        'Die Zahlung hat keine Transaktionsreferenz. Bitte von Hand zuordnen.',
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

    const bill = current.get(payment.reference);
    if (bill === undefined) {
      const earlier = superseded.get(payment.reference);
      if (earlier !== undefined) {
        return reject(
          'superseded_bill',
          `Die Referenz gehört zu einer ersetzten Besuchstag-Rechnung von ${earlier.fullName ?? earlier.registrationNumber} (${earlier.registrationNumber}). Bitte von Hand zuordnen.`,
          earlier,
        );
      }
      return reject('unknown_reference', 'Zu dieser Referenz gibt es keine Besuchstag-Rechnung.');
    }

    const who = `${bill.fullName ?? ''} (${bill.registrationNumber}, ${bill.invoiceNumber})`;
    if (payment.transactionReference === bill.paymentTransactionReference) {
      return reject('already_booked', `${who}: bereits verbucht.`, bill);
    }
    if (bill.status === 'paid' || bookedInFile.has(bill.id)) {
      return reject(
        'double_payment',
        `${who} ist bereits bezahlt. Die Zahlung ist als Doppelzahlung hinterlegt: bitte zurückerstatten oder unter «Zahlungen» einer anderen Rechnung zuordnen.`,
        bill,
      );
    }
    if (bill.status === 'cancelled') {
      return reject(
        'cancelled',
        `${who}: Die Anmeldung ist storniert. Bitte prüfen, ob die Zahlung zurückerstattet wird.`,
        bill,
      );
    }
    const overpaid = toRappen(payment.amount) - toRappen(bill.invoiceAmount);
    if (overpaid < 0 || overpaid > toRappen(OVERPAYMENT_TOLERANCE)) {
      return reject(
        'amount_mismatch',
        `${who} lautet auf ${formatChf(bill.invoiceAmount)}, bezahlt wurden ${formatChf(payment.amount)}. Bitte von Hand verbuchen.`,
        bill,
      );
    }
    bookedInFile.add(bill.id);
    return { payment, outcome: 'booked', billId: bill.id };
  });
}

const toPaymentRow = (
  { payment, outcome, billId, message }: VisitDayPaymentMatch,
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
  ...(billId === undefined
    ? {}
    : { matchedBill: { relationTo: VISIT_DAY_BILL_COLLECTION, value: billId } }),
  importOutcome: outcome,
  importedBy: actor,
  ...(message === undefined ? {} : { importMessage: message }),
  allocations:
    ALLOCATED_OUTCOMES.has(outcome) && billId !== undefined
      ? [
          {
            bill: { relationTo: VISIT_DAY_BILL_COLLECTION, value: billId },
            amount: payment.amount ?? 0,
          },
        ]
      : [],
});

/**
 * Stores the Besuchstag payments of a bank file as payments and books the bills they pay. A
 * payment it cannot assign is stored all the same, for finance to assign under «Zahlungen».
 */
export async function importVisitDayPayments(
  payload: Payload,
  payments: BankPayment[],
  actor: string,
): Promise<PaymentImportSummary> {
  const references = [...new Set(payments.map((payment) => payment.reference))];
  const { docs: bills } = await payload.find({
    collection: VISIT_DAY_BILL_COLLECTION,
    where: {
      or: [
        { referenceNumber: { in: references } },
        { 'issuedBills.referenceNumber': { in: references } },
      ],
    },
    pagination: false,
    depth: 0,
    joins: false,
    overrideAccess: true,
  });
  const transactions = [
    ...new Set(payments.map((payment) => payment.transactionReference).filter((id) => id !== '')),
  ];
  const { docs: known } = await payload.find({
    collection: 'bill-payments',
    where: { transactionReference: { in: transactions } },
    pagination: false,
    depth: 0,
    overrideAccess: true,
  });
  const knownTransactions = new Set(known.map((payment) => payment.transactionReference));

  const matches = matchVisitDayPayments(payments, bills, knownTransactions);
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
    if (match.outcome === 'already_booked' || match.payment.transactionReference === '') continue;
    if (match.payment.amount === undefined || match.payment.amount <= 0) continue;
    try {
      const row = await payload.create({
        collection: 'bill-payments',
        depth: 0,
        overrideAccess: true,
        // the bills are brought in line below, all at once
        context: { paymentImport: true },
        data: toPaymentRow(match, actor),
      });
      saved.push(row);
      for (const id of allocatedBillIds(row, VISIT_DAY_BILL_COLLECTION)) affected.add(id);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      payload.logger.warn(
        `Besuchstag payment import could not store transaction ${match.payment.transactionReference}: ${reason}`,
      );
      summary.errors.push(
        `Zeile ${String(match.payment.line)}: Transaktion ${match.payment.transactionReference} konnte nicht gespeichert werden – ${reason}`,
      );
    }
  }

  const reconciled = await reconcileVisitDayBills(
    payload,
    affected,
    { actor, verb: 'importiert' },
    saved,
  );
  summary.bookedCount = reconciled.bookedIds.length;
  summary.errors.push(...reconciled.errors);
  payload.logger.info(
    `Besuchstag payment import by ${actor}: ${String(summary.totalCount)} payments, ` +
      `${String(summary.bookedCount)} booked, ${String(summary.errors.length)} for manual review.`,
  );
  return summary;
}

/** The Besuchstag bills in the bank import: they claim every valid reference starting with 091. */
export const visitDayPaymentImporter: PaymentImporter = {
  key: 'visit-day',
  label: { de: 'Besuchstag', en: 'Visiting day', fr: 'Journée des visites' },
  claims: isVisitDayPayment,
  importPayments: importVisitDayPayments,
};
