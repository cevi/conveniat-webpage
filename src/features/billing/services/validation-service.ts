export interface ParticipantValidationInput {
  person: {
    firstName?: string | null | undefined;
    lastName?: string | null | undefined;
    nickname?: string | null | undefined;
    street?: string | null | undefined;
    housenumber?: string | null | undefined;
    zipCode?: string | null | undefined;
    town?: string | null | undefined;
    country?: string | null | undefined;
    gender?: string | null | undefined;
    birthday?: string | null | undefined;
  };
  answers: Record<string, string>;
}

export interface ValidationResult {
  isValid: boolean;
  missingFields: string[];
}

/**
 * Validates that all required fields (Pflichtangaben) are present on the participant.
 * Required fields from the registration workflow:
 * - Questions on the event:
 *   - AHV-Nummer?
 *   - T-Shirt Grösse (unisex)
 *   - Mailadresse für Rechnung
 *   - Name der Krankenkasse
 *   - Versichertennummer (Nummer auf der Krankenkassenkarte)
 *   - Notfallkontakt Vollständiger Name
 *   - Notfallkontakt Telefonnummer
 *   - Essgewohnheit
 * - Contact attributes on the person:
 *   - street, housenumber, zipCode, town, country, gender, birthday
 */
// Helper to check if string is null/undefined/empty
const isTrimmedEmpty = (val: string | null | undefined): boolean => {
  return val === null || val === undefined || val.trim() === '';
};

export function validateParticipant(input: ParticipantValidationInput): ValidationResult {
  const missingFields: string[] = [];
  const { person, answers } = input;

  // 1. Verify contact fields
  if (isTrimmedEmpty(person.firstName)) missingFields.push('Vorname');
  if (isTrimmedEmpty(person.lastName)) missingFields.push('Nachname');
  if (isTrimmedEmpty(person.street)) missingFields.push('Strasse');
  if (isTrimmedEmpty(person.housenumber)) missingFields.push('Hausnummer');
  if (isTrimmedEmpty(person.zipCode)) missingFields.push('PLZ');
  if (isTrimmedEmpty(person.town)) missingFields.push('Ort');
  if (isTrimmedEmpty(person.country)) missingFields.push('Land');
  if (isTrimmedEmpty(person.gender)) missingFields.push('Geschlecht');
  if (isTrimmedEmpty(person.birthday)) missingFields.push('Geburtsdatum');

  // 2. Verify custom event questions
  const findAnswer = (questionKeywords: string[]): string | undefined => {
    const entry = Object.entries(answers).find(([qText]) =>
      questionKeywords.every((kw) => qText.toLowerCase().includes(kw.toLowerCase())),
    );
    return entry?.[1];
  };

  const ahv = findAnswer(['ahv', 'nummer']);
  const tshirt = findAnswer(['t-shirt', 'grösse']);
  const invoiceEmail =
    findAnswer(['mailadresse', 'rechnung']) ?? findAnswer(['e-mail', 'rechnung']);
  const krankenkasse = findAnswer(['krankenkasse']);
  const versichertennummer =
    findAnswer(['versichertennummer']) ?? findAnswer(['nummer', 'krankenkasse']);
  const emergencyName =
    findAnswer(['notfallkontakt', 'name']) ?? findAnswer(['notfallkontakt', 'vollständig']);
  const emergencyPhone =
    findAnswer(['notfallkontakt', 'telefon']) ?? findAnswer(['notfallkontakt', 'nummer']);
  const eating = findAnswer(['essgewohnheit']);

  if (isTrimmedEmpty(ahv)) missingFields.push('AHV-Nummer');
  if (isTrimmedEmpty(tshirt)) missingFields.push('T-Shirt Grösse');
  if (isTrimmedEmpty(invoiceEmail)) missingFields.push('Mailadresse für Rechnung');
  if (isTrimmedEmpty(krankenkasse)) missingFields.push('Krankenkasse Name');
  if (isTrimmedEmpty(versichertennummer)) missingFields.push('Versichertennummer');
  if (isTrimmedEmpty(emergencyName)) missingFields.push('Notfallkontakt Name');
  if (isTrimmedEmpty(emergencyPhone)) missingFields.push('Notfallkontakt Telefonnummer');
  if (isTrimmedEmpty(eating)) missingFields.push('Essgewohnheit');

  return {
    isValid: missingFields.length === 0,
    missingFields,
  };
}
