import {
  extractEmailAddress,
  isManualOverrideItem,
  isSystemEmail,
  parseSimplifiedRejectionReason,
} from '@/features/payload-cms/payload-cms/components/smtp-results/utils';

describe('smtp-results utils', () => {
  describe('extractEmailAddress', () => {
    it('should extract email from formatted string with brackets', () => {
      expect(extractEmailAddress('"Cyrill" <cyrill.puentener@cevi.ch>')).toBe(
        'cyrill.puentener@cevi.ch',
      );
      expect(extractEmailAddress('Some User <user@domain.com>')).toBe('user@domain.com');
    });

    it('should return trimmed email when no brackets are present', () => {
      expect(extractEmailAddress('cyrill.puentener@cevi.ch ')).toBe('cyrill.puentener@cevi.ch');
      expect(extractEmailAddress('user@domain.com')).toBe('user@domain.com');
    });

    it('should return empty string for malformed bracketed strings', () => {
      expect(extractEmailAddress('"Malformed" <')).toBe('');
      expect(extractEmailAddress('Malformed < >')).toBe('');
    });
  });

  describe('isSystemEmail', () => {
    it('should identify system emails by local part', () => {
      expect(isSystemEmail('noreply@domain.com')).toBe(true);
      expect(isSystemEmail('NO-REPLY@domain.com')).toBe(true);
      expect(isSystemEmail('postmaster@domain.com')).toBe(true);
      expect(isSystemEmail('info@domain.com')).toBe(false);
    });

    it('should check custom system emails list', () => {
      expect(isSystemEmail('admin@domain.com', ['admin@domain.com'])).toBe(true);
      expect(isSystemEmail('ADMIN@domain.com', ['admin@domain.com'])).toBe(true);
      expect(isSystemEmail('admin@domain.com', ['other@domain.com'])).toBe(false);
    });

    it('should return false for empty email', () => {
      expect(isSystemEmail('')).toBe(false);
    });
  });

  describe('parseSimplifiedRejectionReason', () => {
    it('should recognize user unknown', () => {
      expect(parseSimplifiedRejectionReason('5.1.1', '')).toBe('rejectionUserUnknown');
      expect(parseSimplifiedRejectionReason('', 'user unknown')).toBe('rejectionUserUnknown');
      expect(parseSimplifiedRejectionReason('', 'does not exist')).toBe('rejectionUserUnknown');
    });

    it('should recognize domain not found', () => {
      expect(parseSimplifiedRejectionReason('5.1.2', '')).toBe('rejectionDomainNotFound');
      expect(parseSimplifiedRejectionReason('4.4.4', '')).toBe('rejectionDomainNotFound');
      expect(parseSimplifiedRejectionReason('5.4.4', '')).toBe('rejectionDomainNotFound');
      expect(parseSimplifiedRejectionReason('', 'domain not found')).toBe(
        'rejectionDomainNotFound',
      );
      expect(parseSimplifiedRejectionReason('', 'nullmx')).toBe('rejectionDomainNotFound');
    });

    it('should recognize mailbox full', () => {
      expect(parseSimplifiedRejectionReason('5.2.2', '')).toBe('rejectionMailboxFull');
      expect(parseSimplifiedRejectionReason('', 'quota exceeded')).toBe('rejectionMailboxFull');
      expect(parseSimplifiedRejectionReason('', 'mailbox full')).toBe('rejectionMailboxFull');
    });

    it('should recognize spam policy', () => {
      expect(parseSimplifiedRejectionReason('5.7.1', '')).toBe('rejectionSpamPolicy');
      expect(parseSimplifiedRejectionReason('', 'spam detected')).toBe('rejectionSpamPolicy');
      expect(parseSimplifiedRejectionReason('', 'blocked')).toBe('rejectionSpamPolicy');
      expect(parseSimplifiedRejectionReason('', 'blacklisted')).toBe('rejectionSpamPolicy');
    });

    it('should return generic for other diagnostic codes', () => {
      expect(parseSimplifiedRejectionReason('5.0.0', 'Some custom error')).toBe('rejectionGeneric');
    });

    it('should return undefined for empty status and diagnostic code', () => {
      expect(parseSimplifiedRejectionReason()).toBeUndefined();
      expect(parseSimplifiedRejectionReason('', '')).toBeUndefined();
    });
  });

  describe('isManualOverrideItem', () => {
    it('should identify manualOverride true directly', () => {
      expect(isManualOverrideItem({ manualOverride: true })).toBe(true);
    });

    it('should identify manual override with backward compatibility for SMTP', () => {
      expect(
        isManualOverrideItem({
          retriggeredBy: 'user123',
          response: { response: 'manually set to success' },
        }),
      ).toBe(true);
      expect(
        isManualOverrideItem({
          retriggeredBy: 'user123',
          response: { response: 'manually marked as failed' },
        }),
      ).toBe(true);
    });

    it('should identify manual override with backward compatibility for DSN', () => {
      expect(
        isManualOverrideItem({
          retriggeredBy: 'user123',
          parsedDsn: { diagnosticCode: 'Manually marked as success' },
          bounceReport: true,
        }),
      ).toBe(true);
      expect(
        isManualOverrideItem({
          retriggeredBy: 'user123',
          parsedDsn: { diagnosticCode: 'manually set to failed' },
          bounceReport: true,
        }),
      ).toBe(true);
    });

    it('should return false for regular items', () => {
      expect(isManualOverrideItem({ success: true })).toBe(false);
      expect(isManualOverrideItem({ success: false, error: 'Network error' })).toBe(false);
      expect(
        isManualOverrideItem({
          retriggeredBy: 'user123',
          response: { response: 'Standard SMTP response' },
        }),
      ).toBe(false);
    });
  });
});
