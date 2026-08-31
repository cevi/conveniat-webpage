/**
 * The status a `bill-participants` row carries, and the rule that decides how far a
 * Cevi.DB sync is allowed to move it.
 *
 * Two things live here that used to be spread across the sync and the generator:
 *
 * 1. **Which statuses a bill may still be raised for.** The generator used to accept only
 *    `new`, while the sync happily parked people on `updated` and created re-enrolled
 *    participants as `re_added` — both dead ends that no run ever picked up again.
 *
 * 2. **What happens to a row that has already been invoiced.** Nothing the sync learns
 *    from the Cevi.DB is grounds for queueing a second bill on its own: a role that
 *    stopped being priced, a Pflichtangabe that briefly vanished, or an address that
 *    changed are all reasons for a *human* to look at the bill that is already out there.
 *    Such a row parks in {@link NEEDS_MANUAL_REVIEW} and only leaves it when an operator
 *    explicitly regenerates it.
 *
 * The module is deliberately free of Payload imports so the transition can be tested on
 * its own — it is the one place standing between a participant and a duplicate invoice.
 */

export const BILLING_STATUSES = [
  'new',
  'pflichtangaben_missing',
  'invalid_anmeldeangaben',
  'needs_manual_review',
  'bill_created',
  'bill_sent',
  'removed',
  're_added',
  'updated',
  'reminder_sent',
] as const;

export type BillingStatus = (typeof BILLING_STATUSES)[number];

/** A bill exists, but the sync found something an operator has to judge before it is reissued. */
export const NEEDS_MANUAL_REVIEW = 'needs_manual_review';

/** Statuses that mean a bill has been raised and is out there. */
export const BILLED_STATUSES = ['bill_created', 'bill_sent', 'reminder_sent'] as const;

/**
 * Statuses whose rows carry an invoice the finance team has to account for.
 *
 * `needs_manual_review` is only ever reached from a billed row, so leaving it out would
 * make a booked bill disappear from the exports the moment the sync flagged it.
 */
export const ACCOUNTED_STATUSES = [...BILLED_STATUSES, NEEDS_MANUAL_REVIEW] as const;

/** Statuses a bill can still be raised for. */
export const BILLABLE_STATUSES = ['new', 'updated', 're_added'] as const;

/** Whether a bulk generation run may raise a bill for a row in this status. */
export const isBillable = (status: string | null | undefined): boolean =>
  (BILLABLE_STATUSES as readonly string[]).includes(status ?? '');

/** Whether a row already carries a raised bill, whatever its status says today. */
export const hasRaisedBill = (participant: {
  invoiceNumber?: string | null;
  billCreatedDate?: string | null;
}): boolean => {
  const invoiceNumber = participant.invoiceNumber;
  if (typeof invoiceNumber === 'string' && invoiceNumber.trim() !== '') return true;
  const billCreatedDate = participant.billCreatedDate;
  return typeof billCreatedDate === 'string' && billCreatedDate.trim() !== '';
};

export interface SyncStatusInput {
  /** The status the row carries today. */
  currentStatus: string;
  /** True once a bill has been raised for this row — see {@link hasRaisedBill}. */
  hasBill: boolean;
  /** Whether the bill settings still price this participant's role. */
  isRoleOk: boolean;
  /** Whether a mandatory master-data field or registration answer is missing. */
  isMissingMandatoryData: boolean;
  /** Whether any synced field differs from what is on file. */
  hasChanges: boolean;
}

export interface SyncStatusDecision {
  status: BillingStatus;
  /**
   * Why the row needs a human, in the words the admin panel shows. Only set on the
   * transition *into* {@link NEEDS_MANUAL_REVIEW}, so a row already parked there does not
   * collect a fresh note on every sync.
   */
  reviewReason?: string;
}

const REVIEW_REASONS = {
  roleUnpriced: 'Rollentyp ist in den Rechnungs-Einstellungen nicht mehr konfiguriert.',
  mandatoryDataMissing: 'Pflichtangaben fehlen neu in der Cevi.DB.',
  dataChanged: 'Angaben in der Cevi.DB haben sich nach der Rechnungsstellung geändert.',
} as const;

/**
 * Decides the status a synced participation should end up in.
 *
 * For a row that has never been billed this is the rule the sync always had: an unpriced
 * role or a missing Pflichtangabe blocks it, fixing either releases it back to `new`, and
 * anything else that changed marks it `updated`.
 *
 * For a row that *has* been billed, every one of those branches would previously have
 * thrown the billed state away — and the path `bill_sent → invalid_anmeldeangaben → new`
 * put the participant back in the generation queue, earning them a second invoice number,
 * a second QR reference and a second email against a bill they may already have paid.
 * Such a row is now parked for manual inspection instead.
 */
export const resolveSyncStatus = ({
  currentStatus,
  hasBill,
  isRoleOk,
  isMissingMandatoryData,
  hasChanges,
}: SyncStatusInput): SyncStatusDecision => {
  if (hasBill) {
    if (currentStatus === NEEDS_MANUAL_REVIEW) return { status: NEEDS_MANUAL_REVIEW };
    if (!isRoleOk)
      return { status: NEEDS_MANUAL_REVIEW, reviewReason: REVIEW_REASONS.roleUnpriced };
    if (isMissingMandatoryData)
      return { status: NEEDS_MANUAL_REVIEW, reviewReason: REVIEW_REASONS.mandatoryDataMissing };
    if (hasChanges)
      return { status: NEEDS_MANUAL_REVIEW, reviewReason: REVIEW_REASONS.dataChanged };
    return { status: currentStatus as BillingStatus };
  }

  if (!isRoleOk) return { status: 'invalid_anmeldeangaben' };
  if (isMissingMandatoryData) return { status: 'pflichtangaben_missing' };
  if (currentStatus === 'pflichtangaben_missing' || currentStatus === 'invalid_anmeldeangaben')
    return { status: 'new' };
  if (hasChanges) return { status: 'updated' };
  return { status: currentStatus as BillingStatus };
};
