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

/** The fixed leading digits that mark a reference as a conveniat27 registration bill. */
const QR_REFERENCE_PREFIX = '090';

/** One field of the QR reference, in the order the digits appear. */
export interface QrReferenceSegment {
  key: 'prefix' | 'personId' | 'eventId' | 'participationId' | 'counter' | 'checkDigit';
  /** What the field is called. */
  label: string;
  /** The digits it contributes, zero-padded to its fixed length. */
  digits: string;
  /** Where the digits come from, in the terms an operator would use. */
  source: string;
}

/**
 * Takes the last `length` digits of an id and pads it back out.
 *
 * Every field has a fixed width, so the reference stays 27 digits whatever Cevi.DB hands
 * over. Truncating from the left keeps the part of an id that actually varies.
 */
const toFixedWidthDigits = (value: string | number, length: number): string =>
  String(value).replaceAll(/\D/g, '').slice(-length).padStart(length, '0');

/**
 * Breaks a QR reference into the fields it is assembled from.
 *
 * This is the definition `generateQrReference` builds from, so the explanation shown in the
 * admin panel and the number printed on the bill can never disagree.
 */
export function describeQrReference(
  personId: string | number,
  eventId: string | number,
  participationId: string | number,
  counter: number,
): { reference: string; segments: QrReferenceSegment[] } {
  const personDigits = toFixedWidthDigits(personId, 6);
  const eventDigits = toFixedWidthDigits(eventId, 5);
  const participationDigits = toFixedWidthDigits(participationId, 7);
  const counterDigits = toFixedWidthDigits(counter, 5);

  // 3 + 6 + 5 + 7 + 5 = 26 digits, plus the check digit below = the 27 a QR-IBAN requires.
  const baseReference = `${QR_REFERENCE_PREFIX}${personDigits}${eventDigits}${participationDigits}${counterDigits}`;
  const checkDigit = String(calculateModule10Recursive(baseReference));

  return {
    reference: `${baseReference}${checkDigit}`,
    segments: [
      {
        key: 'prefix',
        label: 'Präfix',
        digits: QR_REFERENCE_PREFIX,
        source: 'Fest. Kennzeichnet eine conveniat27-Anmelderechnung.',
      },
      {
        key: 'personId',
        label: 'Personen-ID',
        digits: personDigits,
        source: `Cevi.DB-ID der Person (${String(personId)}), auf 6 Stellen aufgefüllt.`,
      },
      {
        key: 'eventId',
        label: 'Anlass-ID',
        digits: eventDigits,
        source: `Cevi.DB-ID des Anlasses (${String(eventId)}), auf 5 Stellen aufgefüllt.`,
      },
      {
        key: 'participationId',
        label: 'Teilnahme-ID',
        digits: participationDigits,
        source: `Cevi.DB-ID der Anmeldung (${String(participationId)}), auf 7 Stellen aufgefüllt.`,
      },
      {
        key: 'counter',
        label: 'Rechnungszähler',
        digits: counterDigits,
        source: `Fortlaufende Rechnungsnummer (${String(counter)}), auf 5 Stellen aufgefüllt.`,
      },
      {
        key: 'checkDigit',
        label: 'Prüfziffer',
        digits: checkDigit,
        source: 'Mod-10 rekursiv über die 26 Stellen davor. Erkennt Tippfehler.',
      },
    ],
  };
}

/**
 * Generates a QR reference number from the prefix and sequential counter.
 *
 * Format: 090 UUUUUU EEEEE PPPPPPP CCCCC X (27 digits). See {@link describeQrReference}
 * for what each field is.
 */
export function generateQrReference(
  personId: string | number,
  eventId: string | number,
  participationId: string | number,
  counter: number,
): string {
  return describeQrReference(personId, eventId, participationId, counter).reference;
}

/**
 * Groups a reference the way it is printed on a QR bill: blocks of five from the right,
 * which leaves the first block two digits short. The grouping is presentation only and
 * deliberately cuts across the fields above.
 */
export function formatQrReference(reference: string): string {
  const digits = reference.replaceAll(/\s/g, '');
  const groups: string[] = [];
  for (let end = digits.length; end > 0; end -= 5) {
    groups.unshift(digits.slice(Math.max(0, end - 5), end));
  }
  return groups.join(' ');
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

/** The role pricing fields this module needs; the full shape lives in `bill-settings`. */
export interface RolePricingRoleFields {
  roleTypePattern: string;
  label: string;
  roleName?: string | null;
}

/** One line of the role checklist printed on the registration confirmation. */
export interface RoleOption {
  name: string;
  checked: boolean;
}

/**
 * Resolves the name to show for a configured role: what an operator typed, falling back to
 * the built-in German name for the Hitobito pattern, and finally to the pattern itself.
 */
export function resolveRoleDisplayName(pricing: RolePricingRoleFields): string {
  const configured = pricing.roleName;
  if (typeof configured === 'string' && configured.trim() !== '') return configured.trim();
  return formatRoleName(pricing.roleTypePattern);
}

/**
 * Builds the role checklist for a participant: every configured role, with the one that
 * decided their fee ticked.
 *
 * A wrong role is the most expensive error on a registration and the hardest to notice —
 * it is a Cevi.DB field the participant never sees. Printing only the resolved role invites
 * them to read past it; printing all of them with one ticked makes a wrong tick obvious.
 *
 * The match repeats what `resolvePricing` does, fallback included, so the ticked box is
 * always the entry that actually set the price rather than a second, prettier guess.
 */
export function resolveRoleOptions(
  roleType: string | null | undefined,
  rolePricing: RolePricingRoleFields[],
): RoleOption[] {
  if (rolePricing.length === 0) return [];

  const normalisedRoleType = (roleType ?? '').toLowerCase();
  const matchedIndex = rolePricing.findIndex((pricing) =>
    normalisedRoleType.includes(pricing.roleTypePattern.toLowerCase()),
  );
  // `resolvePricing` bills an unmatched role at the first entry, so that is what gets ticked.
  const billedIndex = matchedIndex === -1 ? 0 : matchedIndex;

  return rolePricing.map((pricing, index) => ({
    name: resolveRoleDisplayName(pricing),
    checked: index === billedIndex,
  }));
}

/**
 * Characters OneDrive rejects in a file or folder name. Umlauts are fine and are kept —
 * the finance team searches these folders by event name.
 */
const ONEDRIVE_FORBIDDEN_CHARACTERS = /["*:<>?/\\|]/g;

/**
 * Drops control characters by code point rather than by regex class, which keeps them out
 * of this file's own source as well as out of the file names.
 */
const stripControlCharacters = (value: string): string =>
  [...value]
    .filter((character) => {
      const code = character.codePointAt(0) ?? 0;
      return code >= 0x20 && code !== 0x7f;
    })
    .join('');

/**
 * Makes one path segment safe for OneDrive.
 *
 * Forbidden characters become hyphens rather than disappearing, so two events whose names
 * differ only there do not collapse into one folder. Trailing dots and spaces are dropped
 * because OneDrive silently rejects names that end in them.
 */
export function toArchivePathSegment(value: string | null | undefined, fallback: string): string {
  const cleaned = stripControlCharacters(typeof value === 'string' ? value : '')
    .replaceAll(ONEDRIVE_FORBIDDEN_CHARACTERS, '-')
    .replaceAll(/\s+/g, ' ')
    .trim()
    .slice(0, 120)
    .replace(/[.\s]+$/, '');

  return cleaned === '' ? fallback : cleaned;
}

/**
 * Where a bill is filed in the archive: by year, then by event, so the finance team can
 * open one camp and see every bill raised for it.
 *
 * The invoice number leads the file name because it is what an incoming payment references,
 * and therefore what a bill gets looked up by.
 */
export function buildBillArchivePath(bill: {
  eventName?: string | null | undefined;
  invoiceNumber?: string | null | undefined;
  fullName?: string | null | undefined;
  billDate: Date;
}): string {
  const year = String(bill.billDate.getFullYear());
  const event = toArchivePathSegment(bill.eventName, 'Ohne Anlass');
  const invoiceNumber = toArchivePathSegment(bill.invoiceNumber, 'ohne-Nummer');
  const name = toArchivePathSegment(bill.fullName, 'unbekannt');

  return `${year}/${event}/Rechnung-${invoiceNumber}_${name}.pdf`;
}
