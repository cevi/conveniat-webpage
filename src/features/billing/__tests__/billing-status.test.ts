import {
  BILLABLE_STATUSES,
  BILLING_STATUSES,
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
