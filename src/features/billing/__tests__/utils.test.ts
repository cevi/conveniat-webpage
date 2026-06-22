import { calculateModule10Recursive, generateQrReference } from '@/features/billing/utils';

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
      // Inputs longer than their allocated length:
      // personId limit is 6. "987654321" should be sliced to last 6: "432100" or similar?
      // Wait, slice(-6) of "987654321" is "543210" or similar?
      // Let's trace slice(-6): "987654321" -> "432100" (wait, .slice(-6) of "987654321" is "543221" (6 characters from end: "432101"?)
      // Actually: "987654321".slice(-6) is "543210"? No, let's count:
      // Index from end:
      // -1: 1
      // -2: 2
      // -3: 3
      // -4: 4
      // -5: 5
      // -6: 6 -> "456789"? No, "987654321".slice(-6) -> "54321".
      // Let's check: "987654321".slice(-6) -> length is 6, so "4321" starts at index 3.
      // Yes, "987654321".slice(-6) is "432100"? No, "987654321".slice(-6) = "432100" if we pad or slice.
      // Let's just test with simpler inputs and verify it is exactly 27 digits.
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
