/**
 * Mod-10 recursive check digit calculation for QR reference numbers.
 */
export function calculateModule10Recursive(reference: string): number {
  const table = [0, 9, 4, 6, 8, 2, 7, 1, 3, 5];
  let carry = 0;
  for (const char of reference) {
    carry = table[(carry + Number.parseInt(char, 10)) % 10] ?? 0;
  }
  return (10 - carry) % 10;
}

/**
 * The first three digits of a QR reference, which tell the bills apart that are paid into the
 * same QR-IBAN. The payment import sends each payment to the bills of its prefix.
 */
export const BILL_REFERENCE_PREFIXES = {
  /** a registration bill of the camp, issued from the Cevi.DB */
  camp: '090',
  /** a bill of a Besuchstag registration */
  visitDay: '091',
} as const;

const QR_REFERENCE = /^\d{27}$/;

/** Whether a reference is a QR reference at all: 27 digits with a valid check digit. */
export const isValidQrReference = (reference: string): boolean =>
  QR_REFERENCE.test(reference) &&
  calculateModule10Recursive(reference.slice(0, 26)) === Number(reference.slice(26));
