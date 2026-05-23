import { DSN_TIMEOUT_MS } from '@/features/payload-cms/payload-cms/components/smtp-results/constants';
import {
  extractEmailAddress,
  formatTimeDifference,
  isManualOverrideItem,
  isSystemEmail,
  parseSimplifiedRejectionReason,
  parseSmtpStats,
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

  describe('formatTimeDifference', () => {
    it('should format seconds', () => {
      const start = new Date(1000);
      const end = new Date(15_000);
      expect(formatTimeDifference(start, end)).toBe('14s');
    });

    it('should format minutes', () => {
      const start = new Date(0);
      const end = new Date(125 * 1000);
      expect(formatTimeDifference(start, end)).toBe('2m');
    });

    it('should format hours', () => {
      const start = new Date(0);
      const end = new Date(3 * 60 * 60 * 1000 + 5 * 60 * 1000);
      expect(formatTimeDifference(start, end)).toBe('3h');
    });

    it('should format days', () => {
      const start = new Date(0);
      const end = new Date(2 * 24 * 60 * 60 * 1000 + 10 * 60 * 60 * 1000);
      expect(formatTimeDifference(start, end)).toBe('2d');
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

  describe('parseSmtpStats', () => {
    it('should handle empty/undefined data', () => {
      const undefinedValue = undefined;
      expect(parseSmtpStats(undefinedValue)).toEqual({
        smtpState: 'empty',
        smtpCount: 0,
        dsnState: 'empty',
        dsnCount: 0,
      });
      expect(parseSmtpStats([])).toEqual({
        smtpState: 'empty',
        smtpCount: 0,
        dsnState: 'empty',
        dsnCount: 0,
      });
    });

    it('should compute normal SMTP success', () => {
      const results = [{ success: true }];
      expect(parseSmtpStats(results)).toEqual({
        smtpState: 'success',
        smtpCount: 1,
        dsnState: 'pending',
        dsnCount: 1,
      });
    });

    it('should compute normal SMTP error', () => {
      const results = [{ success: false, error: 'Failed' }];
      expect(parseSmtpStats(results)).toEqual({
        smtpState: 'error',
        smtpCount: 1,
        dsnState: 'pending',
        dsnCount: 1,
      });
    });

    it('should let errors win when no overrides are present', () => {
      const results = [{ success: true }, { success: false, error: 'Failed' }];
      expect(parseSmtpStats(results)).toEqual({
        smtpState: 'error',
        smtpCount: 1,
        dsnState: 'pending',
        dsnCount: 1,
      });
    });

    it('should compute normal DSN success', () => {
      const results = [{ success: true }, { success: true, bounceReport: true }];
      expect(parseSmtpStats(results)).toEqual({
        smtpState: 'success',
        smtpCount: 1,
        dsnState: 'success',
        dsnCount: 1,
      });
    });

    it('should compute normal DSN error (bounce)', () => {
      const results = [{ success: true }, { success: false, bounceReport: true, error: 'Bounce' }];
      expect(parseSmtpStats(results)).toEqual({
        smtpState: 'success',
        smtpCount: 1,
        dsnState: 'error',
        dsnCount: 1,
      });
    });

    it('should handle SMTP manual override to success', () => {
      const results = [
        { success: false, error: 'Timeout' },
        { success: true, manualOverride: true },
      ];
      expect(parseSmtpStats(results)).toEqual({
        smtpState: 'success',
        smtpCount: 1,
        dsnState: 'pending',
        dsnCount: 1,
      });
    });

    it('should handle DSN manual override to success', () => {
      const results = [
        { success: true },
        { success: false, bounceReport: true, error: 'Bounced' },
        { success: true, bounceReport: true, manualOverride: true },
      ];
      expect(parseSmtpStats(results)).toEqual({
        smtpState: 'success',
        smtpCount: 1,
        dsnState: 'success',
        dsnCount: 1,
      });
    });

    it('should evaluate subsequent SMTP failures after manual override', () => {
      const results = [
        { success: false, error: 'Timeout' },
        { success: true, manualOverride: true },
        { success: false, error: 'Subsequent failure' },
      ];
      expect(parseSmtpStats(results)).toEqual({
        smtpState: 'error',
        smtpCount: 1,
        dsnState: 'pending',
        dsnCount: 1,
      });
    });

    it('should evaluate subsequent DSN failures after manual override', () => {
      const results = [
        { success: true },
        { success: false, bounceReport: true, error: 'Bounced' },
        { success: true, bounceReport: true, manualOverride: true },
        { success: false, bounceReport: true, error: 'Subsequent bounce' },
      ];
      expect(parseSmtpStats(results)).toEqual({
        smtpState: 'success',
        smtpCount: 1,
        dsnState: 'error',
        dsnCount: 1,
      });
    });

    it('should support backward compatible manual overrides', () => {
      const results = [
        { success: false, error: 'Timeout' },
        {
          success: true,
          retriggeredBy: 'admin',
          response: { response: 'manually set to success' },
        },
      ];
      expect(parseSmtpStats(results)).toEqual({
        smtpState: 'success',
        smtpCount: 1,
        dsnState: 'pending',
        dsnCount: 1,
      });
    });

    it('should trigger DSN error if pending and DSN timeout has elapsed', () => {
      const results = [{ success: true }];
      // Set the creation date to be older than the DSN timeout limit
      const olderDate = new Date(Date.now() - DSN_TIMEOUT_MS - 10_000).toISOString();
      expect(parseSmtpStats(results, olderDate)).toEqual({
        smtpState: 'success',
        smtpCount: 1,
        dsnState: 'error',
        dsnCount: 0,
      });
    });

    it('should keep DSN pending if DSN timeout has not elapsed', () => {
      const results = [{ success: true }];
      const recentDate = new Date(Date.now() - DSN_TIMEOUT_MS + 10_000).toISOString();
      expect(parseSmtpStats(results, recentDate)).toEqual({
        smtpState: 'success',
        smtpCount: 1,
        dsnState: 'pending',
        dsnCount: 1,
      });
    });

    it('should handle manually triggered resend (success) after failed SMTP attempt', () => {
      const results = [
        { success: false, error: 'Timeout' },
        { success: true, retriggeredBy: 'user123', retriggeredAt: new Date().toISOString() },
      ];
      expect(parseSmtpStats(results)).toEqual({
        smtpState: 'success',
        smtpCount: 1,
        dsnState: 'pending',
        dsnCount: 1,
      });
    });

    it('should handle manually triggered resend (failure) after failed SMTP attempt', () => {
      const results = [
        { success: false, error: 'Timeout' },
        {
          success: false,
          error: 'Connection refused',
          retriggeredBy: 'user123',
          retriggeredAt: new Date().toISOString(),
        },
      ];
      expect(parseSmtpStats(results)).toEqual({
        smtpState: 'error',
        smtpCount: 1,
        dsnState: 'pending',
        dsnCount: 1,
      });
    });

    it('should reset DSN timeout reference time to the manual resend time', () => {
      const results = [
        { success: false, error: 'Timeout' },
        { success: true, retriggeredBy: 'user123', retriggeredAt: new Date().toISOString() },
      ];
      // Set the original creation date to be older than the DSN timeout limit
      const olderDate = new Date(Date.now() - DSN_TIMEOUT_MS - 50_000).toISOString();
      // It should still be pending because the resend is recent (less than DSN_TIMEOUT_MS from now)
      expect(parseSmtpStats(results, olderDate)).toEqual({
        smtpState: 'success',
        smtpCount: 1,
        dsnState: 'pending',
        dsnCount: 1,
      });
    });
  });
});
