import { BANK_IMPORTS_COLLECTION } from '@/features/billing-core/bank-imports-collection';
import type { BankPayment } from '@/features/billing-core/payment-csv';
import { parsePaymentCsv } from '@/features/billing-core/payment-csv';
import type { PaymentOutcome } from '@/features/billing-core/payment-outcome';
import type { StaticTranslationString } from '@/types/types';
import { campClockOf } from '@/utils/camp-clock';
import type { Payload } from 'payload';

/** What an import did for one kind of bill, for the admin panel to report. */
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

/** What one bank file did, kind of bill by kind of bill. */
export interface BankImportSummary {
  sides: { key: string; label: StaticTranslationString; summary: PaymentImportSummary }[];
}

/** Where a bank file came from, kept with the import. */
export interface BankFileSource {
  /** who imported it, for the payments and the history */
  actor: string;
  /** when the file was exported from the e-banking: it holds every payment up to then */
  bankExportedAt: Date;
  filename?: string;
}

/** A clock running a few minutes ahead of the server's is no reason to refuse a file. */
const CLOCK_SKEW_MS = 5 * 60 * 1000;

/** Refused before anything was booked, because the file cannot be read as a payment list. */
export class PaymentFileError extends Error {}

/** Books the payments of one kind of bill. */
export interface PaymentImporter {
  key: string;
  label: StaticTranslationString;
  /**
   * Whether a payment is this kind's to book. The importers are asked in order, and the last
   * one takes whatever nobody claimed, so a payment is never dropped.
   */
  claims: (payment: BankPayment) => boolean;
  importPayments: (
    payload: Payload,
    payments: BankPayment[],
    actor: string,
  ) => Promise<PaymentImportSummary>;
}

/**
 * Imports one bank CSV for every kind of bill paid into the shared QR-IBAN.
 *
 * The file is read once, each payment goes to the first importer that claims it, which the
 * bills tell apart by the first digits of the QR reference, and the last importer takes the
 * rest: the camp bills, whose import also keeps every payment it cannot assign for finance.
 *
 * Every import is kept in `bank-imports` with the time its bank data reach, which the payment
 * reminders rely on: a time in the future, or before a booking the file contains, is refused.
 *
 * @param importers in the order they are asked, the one taking the rest last
 */
export async function importBankFile(
  payload: Payload,
  csv: string,
  { actor, bankExportedAt, filename }: BankFileSource,
  importers: PaymentImporter[],
  now: Date = new Date(),
): Promise<BankImportSummary> {
  const parsed = parsePaymentCsv(csv);
  if (parsed.error !== undefined) throw new PaymentFileError(parsed.error);
  if (parsed.payments.length === 0) {
    throw new PaymentFileError('Die Datei enthält keine Zahlungen.');
  }
  if (Number.isNaN(bankExportedAt.getTime())) {
    throw new PaymentFileError('Bitte angeben, wann die Datei exportiert wurde.');
  }
  if (bankExportedAt.getTime() > now.getTime() + CLOCK_SKEW_MS) {
    throw new PaymentFileError('Der Stand der Bankdaten liegt in der Zukunft.');
  }
  const lastBooking = parsed.payments
    .map((payment) => payment.bookingDate)
    .filter((date): date is string => date !== undefined)
    .toSorted()
    .at(-1);
  if (lastBooking !== undefined && lastBooking > campClockOf(bankExportedAt).dayKey) {
    throw new PaymentFileError(
      `Die Datei enthält Buchungen vom ${lastBooking}, nach dem angegebenen Stand der Bankdaten. Bitte den Zeitpunkt des Exports prüfen.`,
    );
  }

  const rest = importers.at(-1);
  if (rest === undefined) throw new Error('No payment importer configured.');
  const claimed = new Map<PaymentImporter, BankPayment[]>(
    importers.map((importer) => [importer, []]),
  );
  for (const payment of parsed.payments) {
    const importer = importers.find((candidate) => candidate.claims(payment)) ?? rest;
    claimed.get(importer)?.push(payment);
  }

  const sides: BankImportSummary['sides'] = [];
  for (const importer of importers) {
    const payments = claimed.get(importer) ?? [];
    // a kind with nothing in the file is not asked, so it reads nothing either
    if (payments.length === 0) continue;
    sides.push({
      key: importer.key,
      label: importer.label,
      summary: await importer.importPayments(payload, payments, actor),
    });
  }
  // Recorded only once every kind has booked its payments. A file that fails halfway leaves no
  // record, so the bank data's time does not advance past payments that may be missing; the
  // file is imported again, and what was booked already is recognised and skipped.
  await payload.create({
    collection: BANK_IMPORTS_COLLECTION,
    overrideAccess: true,
    data: {
      bankExportedAt: bankExportedAt.toISOString(),
      importedBy: actor,
      ...(filename === undefined ? {} : { filename }),
      paymentCount: parsed.payments.length,
      bookedCount: sides.reduce((sum, side) => sum + side.summary.bookedCount, 0),
    },
  });
  payload.logger.info(
    `Bank file ${filename ?? ''} imported by ${actor}, bank data as of ${bankExportedAt.toISOString()}.`,
  );
  return { sides };
}
