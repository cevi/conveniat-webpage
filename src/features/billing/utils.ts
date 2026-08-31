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

/**
 * German names for the Hitobito event roles, keyed by the suffix of the role type.
 *
 * Hitobito namespaces the same role twice — `Event::Role::Leader` on a plain event and
 * `Event::Camp::Role::Leader` on a camp — so only the last segment is matched.
 */
const ROLE_NAMES_DE: Record<string, string> = {
  AssistantLeader: 'Hilfsleiter:in',
  Cook: 'Küche',
  Helper: 'Helfer:in',
  Leader: 'Leiter:in',
  Participant: 'Teilnehmer:in',
  Speaker: 'Referent:in',
  Treasurer: 'Kassier:in',
};

/**
 * Turns a Hitobito role type into something a participant can read.
 *
 * `Event::Role::Leader` is an implementation detail of the Cevi.DB; on a registration
 * confirmation it has to say "Leiter:in". An unmapped role falls back to its bare suffix,
 * which is still far better than the full namespace.
 */
export function formatRoleName(roleType: string | null | undefined): string {
  if (typeof roleType !== 'string' || roleType.trim() === '') return '–';
  const suffix = roleType.split('::').at(-1)?.trim() ?? '';
  return ROLE_NAMES_DE[suffix] ?? (suffix === '' ? roleType : suffix);
}

/**
 * Formats a Cevi.DB birthday for print.
 *
 * Hitobito serves ISO dates, but the field is free text upstream, so anything that is not
 * an ISO date is passed through untouched rather than mangled into a wrong date.
 */
export function formatBirthday(birthday: string | null | undefined): string {
  if (typeof birthday !== 'string' || birthday.trim() === '') return '–';
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(birthday.trim());
  if (match === null) return birthday.trim();
  return `${match[3]}.${match[2]}.${match[1]}`;
}
