import type { SyncStatusDecision } from '@/features/billing/services/billing-status';
import {
  ALLOWED_TRANSITIONS,
  BILLABLE_STATUSES,
  BILLING_STATUSES,
  canTransition,
  formatBillingStatus,
  hasRaisedBill,
  isBillable,
  NEEDS_MANUAL_REVIEW,
  resolveSyncStatus,
} from '@/features/billing/services/billing-status';

const unbilled = {
  currentStatus: 'new',
  hasBill: false,
  isRoleOk: true,
  isMissingMandatoryData: false,
  hasChanges: false,
};

const billed = { ...unbilled, currentStatus: 'bill_sent', hasBill: true };

describe('hasRaisedBill', () => {
  it('recognises a row by its invoice number', () => {
    expect(hasRaisedBill({ invoiceNumber: '2027-0001' })).toBe(true);
  });

  it('recognises a row that got as far as a bill date without a number', () => {
    expect(hasRaisedBill({ billCreatedDate: '2027-01-05T10:00:00Z' })).toBe(true);
  });

  it('does not count an empty or absent invoice number', () => {
    expect(hasRaisedBill({})).toBe(false);
    // eslint-disable-next-line unicorn/no-null -- Payload stores absent text fields as null
    expect(hasRaisedBill({ invoiceNumber: null, billCreatedDate: null })).toBe(false);
    expect(hasRaisedBill({ invoiceNumber: '   ' })).toBe(false);
  });
});

describe('isBillable', () => {
  it('accepts every status a bill may still be raised for', () => {
    for (const status of BILLABLE_STATUSES) expect(isBillable(status)).toBe(true);
  });

  it('covers the two statuses that used to be dead ends', () => {
    // A re-enrolled participant is created as `re_added` and a participant whose Cevi.DB
    // data moved becomes `updated`. Generation only ever selected `new`, so neither was
    // billed again — they just accumulated.
    expect(isBillable('re_added')).toBe(true);
    expect(isBillable('updated')).toBe(true);
  });

  it('refuses statuses that must not be billed', () => {
    for (const status of [
      'bill_created',
      'bill_sent',
      'reminder_sent',
      'removed',
      'pflichtangaben_missing',
      'invalid_anmeldeangaben',
      NEEDS_MANUAL_REVIEW,
    ]) {
      expect(isBillable(status)).toBe(false);
    }
  });
});

describe('resolveSyncStatus — a participant who has not been billed yet', () => {
  it('blocks a role nothing prices', () => {
    expect(resolveSyncStatus({ ...unbilled, isRoleOk: false }).status).toBe(
      'invalid_anmeldeangaben',
    );
  });

  it('blocks a registration missing its Pflichtangaben', () => {
    expect(resolveSyncStatus({ ...unbilled, isMissingMandatoryData: true }).status).toBe(
      'pflichtangaben_missing',
    );
  });

  it('releases a blocked registration back to new once it is complete', () => {
    expect(resolveSyncStatus({ ...unbilled, currentStatus: 'pflichtangaben_missing' }).status).toBe(
      'new',
    );
    expect(resolveSyncStatus({ ...unbilled, currentStatus: 'invalid_anmeldeangaben' }).status).toBe(
      'new',
    );
  });

  it('marks changed data as updated', () => {
    expect(resolveSyncStatus({ ...unbilled, hasChanges: true }).status).toBe('updated');
  });

  it('leaves an unchanged row alone', () => {
    expect(resolveSyncStatus(unbilled).status).toBe('new');
  });
});

describe('resolveSyncStatus — a participant who has already been billed', () => {
  it('never puts a billed participant back into the generation queue', () => {
    // The regression this rule exists for: `bill_sent` → a pricing row is renamed →
    // `invalid_anmeldeangaben` → the row is restored → `new` → a second invoice number, a
    // second QR reference and a second email against a bill that may already be paid.
    const afterPricingRowRemoved = resolveSyncStatus({ ...billed, isRoleOk: false });
    expect(afterPricingRowRemoved.status).toBe(NEEDS_MANUAL_REVIEW);
    expect(isBillable(afterPricingRowRemoved.status)).toBe(false);

    const afterPricingRowRestored = resolveSyncStatus({
      ...billed,
      currentStatus: afterPricingRowRemoved.status,
    });
    expect(afterPricingRowRestored.status).toBe(NEEDS_MANUAL_REVIEW);
    expect(isBillable(afterPricingRowRestored.status)).toBe(false);
  });

  it('parks a billed participant whose Pflichtangaben went missing', () => {
    const decision = resolveSyncStatus({ ...billed, isMissingMandatoryData: true });
    expect(decision.status).toBe(NEEDS_MANUAL_REVIEW);
    expect(decision.reviewReason).toContain('Pflichtangaben');
  });

  it('parks a billed participant whose data changed after the bill went out', () => {
    const decision = resolveSyncStatus({ ...billed, hasChanges: true });
    expect(decision.status).toBe(NEEDS_MANUAL_REVIEW);
    expect(decision.reviewReason).toContain('geändert');
  });

  it('names the reason on the way in, and does not repeat it on later syncs', () => {
    expect(resolveSyncStatus({ ...billed, isRoleOk: false }).reviewReason).toBeDefined();
    expect(
      resolveSyncStatus({ ...billed, currentStatus: NEEDS_MANUAL_REVIEW, isRoleOk: false })
        .reviewReason,
    ).toBeUndefined();
  });

  it('leaves a billed participant with nothing wrong exactly where they are', () => {
    expect(resolveSyncStatus(billed).status).toBe('bill_sent');
    expect(resolveSyncStatus({ ...billed, currentStatus: 'bill_created' }).status).toBe(
      'bill_created',
    );
    expect(resolveSyncStatus({ ...billed, currentStatus: 'reminder_sent' }).status).toBe(
      'reminder_sent',
    );
  });
});

describe('formatBillingStatus', () => {
  it('names every status in German', () => {
    // No status may fall through to its raw slug: the messages a billing run reports are
    // read by operators, and "der Status war wieder \'updated\'" is what this replaced.
    for (const status of BILLING_STATUSES) {
      expect(formatBillingStatus(status)).not.toBe(status);
      expect(formatBillingStatus(status)).not.toMatch(/_/);
    }
  });

  it('uses the wording the admin panel shows', () => {
    expect(formatBillingStatus('updated')).toBe('Aktualisiert');
    expect(formatBillingStatus(NEEDS_MANUAL_REVIEW)).toBe('Manuelle Prüfung nötig');
    expect(formatBillingStatus('bill_sent')).toBe('Rechnung gesendet');
  });

  it('falls back rather than showing nothing for an unknown value', () => {
    expect(formatBillingStatus('something_else')).toBe('something_else');
    const missing: string | undefined = undefined;
    expect(formatBillingStatus(missing)).toBe('unbekannt');
  });
});

describe('canTransition', () => {
  it('never refuses a status re-write of the same value', () => {
    // Syncs are idempotent and touch rows without meaning to move them.
    for (const status of BILLING_STATUSES) expect(canTransition(status, status)).toBe(true);
  });

  it('refuses to resurrect a cancelled registration', () => {
    // The bug this table exists for: "Neu generieren" set `new` on a `removed` row, which
    // brought back a registration the Cevi.DB no longer had. The sync then found an event
    // whose list was empty while the database still held an active row, and reported the
    // same irreconcilable error on every run.
    expect(canTransition('removed', 'new')).toBe(false);
    expect(canTransition('removed', 'bill_created')).toBe(false);
    expect(canTransition('removed', 'updated')).toBe(false);
  });

  it('lets a genuine re-enrolment back in, as re_added', () => {
    expect(canTransition('removed', 're_added')).toBe(true);
  });

  it('allows cancelling from every state a registration can actually be in', () => {
    for (const status of BILLING_STATUSES) {
      if (status === 'removed') continue;
      expect(canTransition(status, 'removed')).toBe(true);
    }
  });

  it('allows the deliberate reissue of an existing bill', () => {
    // The per-row action sets `new` before regenerating; that has to stay possible.
    expect(canTransition('bill_sent', 'new')).toBe(true);
    expect(canTransition('needs_manual_review', 'new')).toBe(true);
  });

  it('does not strand a row whose status predates the table', () => {
    expect(canTransition('some_legacy_status', 'removed')).toBe(true);
  });

  it('only ever names statuses that exist', () => {
    for (const [from, targets] of Object.entries(ALLOWED_TRANSITIONS)) {
      expect(BILLING_STATUSES).toContain(from);
      for (const to of targets) expect(BILLING_STATUSES).toContain(to);
    }
  });

  it('is defined for every status', () => {
    for (const status of BILLING_STATUSES) expect(ALLOWED_TRANSITIONS[status]).toBeDefined();
  });
});

describe('resolveSyncStatus — a participation that comes back', () => {
  it('returns as re_added rather than as a fresh registration', () => {
    const decision = resolveSyncStatus({
      currentStatus: 'removed',
      hasBill: false,
      isRoleOk: true,
      isMissingMandatoryData: false,
      hasChanges: true,
    });
    expect(decision.status).toBe('re_added');
    expect(canTransition('removed', decision.status)).toBe(true);
  });

  it('does so even when a bill had already been raised', () => {
    expect(
      resolveSyncStatus({
        currentStatus: 'removed',
        hasBill: true,
        isRoleOk: true,
        isMissingMandatoryData: false,
        hasChanges: false,
      }).status,
    ).toBe('re_added');
  });
});

describe('resolveSyncStatus only produces legal transitions', () => {
  it('holds for every combination of inputs and starting status', () => {
    // The sync is the busiest writer of statuses, so rather than trusting it branch by
    // branch, every reachable decision is checked against the table.
    for (const currentStatus of BILLING_STATUSES) {
      for (const hasBill of [true, false]) {
        for (const isRoleOk of [true, false]) {
          for (const isMissingMandatoryData of [true, false]) {
            for (const hasChanges of [true, false]) {
              const { status } = resolveSyncStatus({
                currentStatus,
                hasBill,
                isRoleOk,
                isMissingMandatoryData,
                hasChanges,
              });
              expect({
                from: currentStatus,
                to: status,
                legal: canTransition(currentStatus, status),
              }).toEqual({ from: currentStatus, to: status, legal: true });
            }
          }
        }
      }
    }
  });
});

/**
 * The camp admin clears a mandatory field in the Cevi.DB on a participant who has already
 * been invoiced.
 */
const afterFieldDeleted = (currentStatus: string, hasBill: boolean): SyncStatusDecision =>
  resolveSyncStatus({
    currentStatus,
    hasBill,
    isRoleOk: true,
    isMissingMandatoryData: true,
    hasChanges: true,
  });

describe('a Pflichtangabe deleted after the bill went out', () => {
  // Entirely reachable, and it must not drop the row into `pflichtangaben_missing`: from
  // there it can return to `new` and be billed a second time. It is flagged for a human
  // instead, with the bill left intact.

  it('flags a created bill for manual verification', () => {
    const decision = afterFieldDeleted('bill_created', true);
    expect(decision.status).toBe(NEEDS_MANUAL_REVIEW);
    expect(decision.reviewReason).toContain('Pflichtangaben');
  });

  it('flags a bill that has already been sent', () => {
    expect(afterFieldDeleted('bill_sent', true).status).toBe(NEEDS_MANUAL_REVIEW);
    expect(afterFieldDeleted('reminder_sent', true).status).toBe(NEEDS_MANUAL_REVIEW);
  });

  it('never routes a billed registration to pflichtangaben_missing', () => {
    for (const status of ['bill_created', 'bill_sent', 'reminder_sent']) {
      expect(afterFieldDeleted(status, true).status).not.toBe('pflichtangaben_missing');
      // Also with the invoice fields themselves cleared: the status alone is enough.
      expect(afterFieldDeleted(status, false).status).not.toBe('pflichtangaben_missing');
      expect(afterFieldDeleted(status, false).status).toBe(NEEDS_MANUAL_REVIEW);
    }
  });

  it('still blocks a registration that was never billed', () => {
    // The same deletion on an unbilled row is an ordinary Pflichtangaben gap.
    expect(afterFieldDeleted('new', false).status).toBe('pflichtangaben_missing');
  });
});
