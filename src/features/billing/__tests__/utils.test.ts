import {
  calculateModule10Recursive,
  formatRoleName,
  generateQrReference,
} from '@/features/billing/utils';

describe('Billing Utilities', () => {
  describe('calculateModule10Recursive', () => {
    it('should calculate correct modulo 10 checksum digit', () => {
      // Examples of valid mod10 values
      expect(calculateModule10Recursive('123456')).toBe(5);
      expect(calculateModule10Recursive('09000000000000000000000000')).toBe(3);
      expect(calculateModule10Recursive('09000123412345123456712345')).toBe(8);
    });
  });

  describe('generateQrReference', () => {
    it('should construct a 27-digit QR reference number with leading zeros and correct check digit', () => {
      const reference = generateQrReference('123456', '12345', '1234567', 9);

      // Length check: 27 digits
      expect(reference).toHaveLength(27);

      // Prefix check
      expect(reference.startsWith('090')).toBe(true);

      // Value matches
      // personId: 123456 -> 123456
      // eventId: 12345 -> 12345
      // participationId: 1234567 -> 1234567
      // counter: 9 -> 00009
      // baseReference = 090 123456 12345 1234567 00009 (26 digits)
      const baseExpected = '09012345612345123456700009';
      expect(reference.slice(0, 26)).toBe(baseExpected);

      const checkDigit = calculateModule10Recursive(baseExpected);
      expect(reference.slice(-1)).toBe(String(checkDigit));
    });

    it('should slice personId, eventId, and participationId correctly if they are too long', () => {
      // Inputs longer than their allocated slot are sliced to the last N digits, then zero-padded.
      // e.g. "999123456".slice(-6) = "123456", "9912345".slice(-5) = "12345", "9991234567".slice(-7) = "1234567"
      const reference = generateQrReference('999123456', '9912345', '9991234567', 123);
      expect(reference).toHaveLength(27);

      // Expected padded/sliced segments:
      // person: "123456"
      // event: "12345"
      // participation: "1234567"
      // counter: "00123"
      const baseExpected = '09012345612345123456700123';
      expect(reference.slice(0, 26)).toBe(baseExpected);
    });
  });
});

describe('formatRoleName', () => {
  it('names the plain event roles in German', () => {
    expect(formatRoleName('Event::Role::Participant')).toBe('Teilnehmer:in');
    expect(formatRoleName('Event::Role::Leader')).toBe('Leiter:in');
    expect(formatRoleName('Event::Role::AssistantLeader')).toBe('Hilfsleiter:in');
  });

  it('names the camp variants the same way', () => {
    // Hitobito namespaces the same role twice; a participant should not see the difference.
    expect(formatRoleName('Event::Camp::Role::Leader')).toBe('Leiter:in');
    expect(formatRoleName('Event::Camp::Role::Participant')).toBe('Teilnehmer:in');
  });

  it('falls back to the bare suffix for a role nobody has mapped yet', () => {
    expect(formatRoleName('Event::Role::Quartermaster')).toBe('Quartermaster');
  });

  it('renders a dash when the role never made it out of Cevi.DB', () => {
    expect(formatRoleName('')).toBe('–');
    // eslint-disable-next-line unicorn/no-useless-undefined -- a missing role is the case under test
    expect(formatRoleName(undefined)).toBe('–');
  });
});
