/* eslint-disable unicorn/no-null -- Payload types an unset field of `issuedBills` as null */
import type { BillParticipant } from '@/features/payload-cms/payload-types';

/**
 * Every bill a registration has carried, and whether it still stands.
 *
 * A `bill-participants` row keeps one set of invoice fields, and "Neu generieren" overwrites
 * them — so before `issuedBills` existed, a replaced bill left nothing behind but its PDF.
 * The finance team still has to account for it: it may have been paid, and a payment has to
 * be matched against a bill that is listed somewhere.
 *
 * Kept free of Payload runtime imports, like `billing-status`, so it can be tested on its own.
 */

export type IssuedBill = NonNullable<BillParticipant['issuedBills']>[number];

type BillSource = Pick<
  BillParticipant,
  | 'issuedBills'
  | 'invoiceNumber'
  | 'referenceNumber'
  | 'invoiceAmount'
  | 'billCreatedDate'
  | 'status'
  | 'removedDate'
  | 'syncHistory'
>;

/** The history actions that mean a registration was cancelled. */
const REMOVAL_ACTIONS = new Set(['removed_detected', 'manually_removed']);

const FALLBACK_REMOVAL_REASON = 'Anmeldung storniert.';

/** Matches the name the bill generator gives a PDF: `Rechnung-<invoice>-<Date.now()>.pdf`. */
const PDF_FILENAME = /^Rechnung-(.+)-(\d{13})(?:-\d+)?\.pdf$/;

/**
 * Why a registration was cancelled, as its most recent removal entry in the history says.
 *
 * A manual cancellation carries the operator's reason on its own; the sync only writes a
 * `reviewReason`, and so did a manual one before the reason was asked for.
 */
export const describeRemoval = (syncHistory: unknown): string => {
  if (!Array.isArray(syncHistory)) return FALLBACK_REMOVAL_REASON;
  for (const entry of syncHistory.toReversed() as unknown[]) {
    if (entry === null || typeof entry !== 'object') continue;
    const { action, cancelReason, reviewReason } = entry as Record<string, unknown>;
    if (typeof action !== 'string' || !REMOVAL_ACTIONS.has(action)) continue;
    for (const reason of [cancelReason, reviewReason]) {
      if (typeof reason === 'string' && reason.trim() !== '') return reason.trim();
    }
    return FALLBACK_REMOVAL_REASON;
  }
  return FALLBACK_REMOVAL_REASON;
};

const supersededBy = (invoiceNumber: string): string => `Ersetzt durch Rechnung ${invoiceNumber}.`;

/**
 * Whether a bill no longer stands. Every cancellation records its reason, while the date can
 * be unknown for a bill rebuilt from a row written before `issuedBills` existed.
 */
export const isCancelled = (bill: IssuedBill): boolean => (bill.cancelReason ?? '') !== '';

/**
 * Rebuilds the bills of a row written before `issuedBills` existed.
 *
 * The current bill comes from the invoice fields. The ones it replaced survive only as PDF
 * filenames, which carry the invoice number and the moment it was raised but not its amount
 * or QR reference — those were overwritten and are left empty rather than guessed.
 */
const reconstructIssuedBills = (participant: BillSource, pdfFilenames: string[]): IssuedBill[] => {
  const currentInvoice = participant.invoiceNumber ?? '';

  const earlier = new Map<string, string>();
  for (const filename of pdfFilenames) {
    const match = PDF_FILENAME.exec(filename);
    if (match === null) continue;
    const [, invoiceNumber = '', timestamp = ''] = match;
    if (invoiceNumber === currentInvoice || earlier.has(invoiceNumber)) continue;
    earlier.set(invoiceNumber, new Date(Number(timestamp)).toISOString());
  }

  const bills: IssuedBill[] = [...earlier]
    .map(([invoiceNumber, billCreatedDate]) => ({ invoiceNumber, billCreatedDate }))
    .sort((a, b) => a.billCreatedDate.localeCompare(b.billCreatedDate));

  if (currentInvoice !== '') {
    bills.push({
      invoiceNumber: currentInvoice,
      referenceNumber: participant.referenceNumber ?? null,
      invoiceAmount: participant.invoiceAmount ?? null,
      billCreatedDate: participant.billCreatedDate ?? null,
    });
  }

  // Each earlier bill was replaced by the one raised after it.
  for (const [index, bill] of bills.entries()) {
    const next = bills[index + 1];
    if (next === undefined) continue;
    bill.cancelledDate = next.billCreatedDate ?? null;
    bill.cancelReason = supersededBy(next.invoiceNumber);
  }

  const last = bills.at(-1);
  if (last !== undefined && !isCancelled(last) && participant.status === 'removed') {
    last.cancelledDate = participant.removedDate ?? null;
    last.cancelReason = describeRemoval(participant.syncHistory);
  }

  return bills;
};

/**
 * The bills a row has carried, oldest first.
 *
 * Falls back to reconstructing them for a row that has not been written since
 * `issuedBills` was added, so the export needs no migration to be complete.
 */
export const resolveIssuedBills = (
  participant: BillSource,
  pdfFilenames: string[] = [],
): IssuedBill[] => {
  const stored = participant.issuedBills ?? [];
  if (stored.length > 0) return stored;
  return reconstructIssuedBills(participant, pdfFilenames);
};

/** The filenames of the PDFs attached to a row, where they have been populated. */
export const populatedPdfFilenames = (billPdfs: BillParticipant['billPdfs']): string[] =>
  (billPdfs ?? []).flatMap((pdf) =>
    typeof pdf === 'object' && typeof pdf.filename === 'string' ? [pdf.filename] : [],
  );

const cancelOpen = (bills: IssuedBill[], reason: string, now: string): IssuedBill[] =>
  bills.map((bill) =>
    isCancelled(bill) ? bill : { ...bill, cancelledDate: now, cancelReason: reason },
  );

/** Records a newly raised bill, which replaces whichever bill was still standing. */
export const recordNewBill = (bills: IssuedBill[], bill: IssuedBill, now: string): IssuedBill[] => [
  ...cancelOpen(bills, supersededBy(bill.invoiceNumber), now),
  bill,
];

/** Cancels the standing bill because the registration was removed. */
export const recordRemoval = (bills: IssuedBill[], reason: string, now: string): IssuedBill[] =>
  cancelOpen(bills, reason, now);
