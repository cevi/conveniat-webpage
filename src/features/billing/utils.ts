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
 * Generates a QR reference number from the prefix and sequential counter.
 */
export function generateQrReference(
  personId: string | number,
  eventId: string | number,
  participationId: string | number,
  counter: number,
): string {
  // Format: 09 0UUUU UUEEE EEPPP PPPPC CCCCX (27 digits total)
  // 090       = fixer Präfix (Referenznummer-Bereich für Anmelde-Rechnungen)
  // UUUUUU    = Personen-ID (max. 6-stellig)
  // EEEEE     = Event-ID (max. 5-stellig)
  // PPPPPPP   = Teilnahme-ID (max. 7-stellig)
  // CCCCC     = Rechnungszähler (5-stellig)
  // X         = Mod-10 Prüfziffer (Swiss QR standard, always last digit)
  const personString = String(personId).replaceAll(/\D/g, '').slice(-6).padStart(6, '0');
  const eventString = String(eventId).replaceAll(/\D/g, '').slice(-5).padStart(5, '0');
  const partString = String(participationId).replaceAll(/\D/g, '').slice(-7).padStart(7, '0');
  const counterString = String(counter).replaceAll(/\D/g, '').slice(-5).padStart(5, '0');

  // 090 (3) + u (6) + e (5) + p (7) + c (5) = 26 base digits
  const baseReference = `090${personString}${eventString}${partString}${counterString}`;

  const checkDigit = calculateModule10Recursive(baseReference);

  return `${baseReference}${String(checkDigit)}`;
}
