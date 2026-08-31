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
  // A participation that comes back under the same id. `re_added` already exists for the
  // case where Cevi.DB issues a *new* participation id, and this is the same event from
  // the participant's point of view, so it gets the same status rather than looking like a
  // registration that was never away.
  if (currentStatus === 'removed') {
    return {
      status: 're_added',
      reviewReason: 'Die Anmeldung ist in der Cevi.DB wieder vorhanden.',
    };
  }

  // A row whose *status* says a bill exists carries one even if the invoice fields are
  // empty. The case this is really for: the camp admin clears a Pflichtangabe in the
  // Cevi.DB on someone who has already been invoiced. That is an ordinary thing to happen,
  // and the bill has to be looked at — but it must not drop the row into
  // `pflichtangaben_missing`, which leads back to `new` and to a second invoice. It is
  // flagged for a human instead, with the bill left intact.
  const carriesBill = hasBill || (ACCOUNTED_STATUSES as readonly string[]).includes(currentStatus);

  if (carriesBill) {
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

/**
 * What each status is called in German — the wording the admin panel shows.
 *
 * Kept here so the status cell, the finance export and the messages a run reports all
 * name a status the same way. An operator reading "der Status war wieder \'updated\'"
 * has to translate an internal slug in their head to find the row it is about.
 */
export const BILLING_STATUS_LABELS_DE: Record<BillingStatus, string> = {
  new: 'Vollständig erfasst',
  pflichtangaben_missing: 'Pflichtangaben fehlen',
  invalid_anmeldeangaben: 'Anmeldeangaben ungültig',
  needs_manual_review: 'Manuelle Prüfung nötig',
  bill_created: 'Rechnung erstellt',
  bill_sent: 'Rechnung gesendet',
  removed: 'Entfernt',
  re_added: 'Erneut hinzugefügt',
  updated: 'Aktualisiert',
  reminder_sent: 'Mahnung gesendet',
};

/** The German label for a status, falling back to the raw value for anything unknown. */
export const formatBillingStatus = (status: string | null | undefined = ''): string => {
  const key = status ?? '';
  if (key === '') return 'unbekannt';
  // A status the map does not know is shown as-is rather than swallowed: a blank cell
  // would hide the very row an operator is looking for.
  return Object.hasOwn(BILLING_STATUS_LABELS_DE, key)
    ? BILLING_STATUS_LABELS_DE[key as BillingStatus]
    : key;
};

/**
 * Which status each status may move to.
 *
 * The states were previously only implied by whichever branch happened to write them, and
 * the gaps showed: the per-row "Neu generieren" action set `new` on *any* row, including
 * one already marked `removed`, which resurrected a participation that no longer exists in
 * the Cevi.DB. The sync then found an event whose participation list was empty while the
 * database still held an active row for it, and refused to reconcile the two — reporting
 * the same error on every run, forever.
 *
 * A move to the same status is always allowed: syncs are idempotent and re-write a row
 * without meaning to change its state.
 *
 * `removed` is deliberately near-terminal. A participation that comes back reaches
 * `re_added`, never `new`, so "this person cancelled and returned" stays visible instead of
 * looking like a fresh registration.
 */
export const ALLOWED_TRANSITIONS: Record<BillingStatus, readonly BillingStatus[]> = {
  // `needs_manual_review` is reachable from every un-cancelled state: a row that carries an
  // invoice while sitting in a billable status is precisely what has to be parked for a
  // human, and that is the shape a row left over from before these rules arrives in.
  new: [
    'pflichtangaben_missing',
    'invalid_anmeldeangaben',
    'updated',
    'bill_created',
    'needs_manual_review',
    'removed',
  ],
  updated: [
    'new',
    'pflichtangaben_missing',
    'invalid_anmeldeangaben',
    'bill_created',
    'needs_manual_review',
    'removed',
  ],
  re_added: [
    'new',
    'updated',
    'pflichtangaben_missing',
    'invalid_anmeldeangaben',
    'bill_created',
    'needs_manual_review',
    'removed',
  ],
  pflichtangaben_missing: [
    'new',
    'updated',
    'invalid_anmeldeangaben',
    'needs_manual_review',
    'removed',
  ],
  invalid_anmeldeangaben: [
    'new',
    'updated',
    'pflichtangaben_missing',
    'needs_manual_review',
    'removed',
  ],
  // A raised bill can be sent, chased, flagged for a human, cancelled, or — only through
  // the explicit per-row action — deliberately reissued.
  bill_created: ['bill_sent', 'reminder_sent', 'needs_manual_review', 'new', 'removed'],
  bill_sent: ['reminder_sent', 'needs_manual_review', 'new', 'removed'],
  reminder_sent: ['bill_sent', 'needs_manual_review', 'new', 'removed'],
  needs_manual_review: ['new', 'bill_created', 'bill_sent', 'reminder_sent', 'removed'],
  // Cancelled. Only a genuine re-enrolment brings a participation back.
  removed: ['re_added'],
};

/** Whether `to` is a legal next status for `from`. Same-to-same is always legal. */
export const canTransition = (from: string, to: string): boolean => {
  if (from === to) return true;
  const allowed = ALLOWED_TRANSITIONS[from as BillingStatus] as readonly string[] | undefined;
  // An unknown current status is not something to refuse on: it can only come from data
  // written before this table existed, and refusing would strand the row for good.
  if (allowed === undefined) return true;
  return allowed.includes(to);
};

/** Why a transition was refused, in the words the admin panel shows. */
export const describeRefusedTransition = (from: string, to: string): string =>
  `Statuswechsel von „${formatBillingStatus(from)}“ zu „${formatBillingStatus(to)}“ ist nicht zulässig.`;
