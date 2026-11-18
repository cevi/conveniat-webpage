import { z } from 'zod';

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
  missingStammdaten: string[];
  missingAnmeldeangaben: string[];
}

/**
 * Whether a role can be billed at all — that is, whether the bill settings price it.
 *
 * This used to be a hard-coded list of three Hitobito roles that happened to match what was
 * configured. The two drift: a role nobody has priced cannot be billed, and a bill raised
 * for one would silently take whatever the first pricing row charges. So the question is
 * answered from the configuration itself, using the same substring rule `resolvePricing`
 * bills by, which is what keeps the two from disagreeing.
 *
 * With no pricing configured at all, nothing is billable.
 */
export function isRoleAllowed(
  roleType: string | null | undefined,
  rolePricingPatterns: string[],
): boolean {
  const normalised = (roleType ?? '').toLowerCase();
  if (normalised === '') return false;
  return rolePricingPatterns.some(
    (pattern) => pattern !== '' && normalised.includes(pattern.toLowerCase()),
  );
}

/**
 * How a role ranks when a participation holds several, by the last segment of its type,
 * since Hitobito namespaces the same role twice (`Event::Role::Leader` and
 * `Event::Camp::Role::Leader`). Hauptleitung before Leitung before Teilnehmer:in; any other
 * role is still a function in the camp and sits above a plain participant.
 */
function billedRoleRank(roleType: string): number {
  switch (roleType.split('::').at(-1)) {
    case 'Leader': {
      return 3;
    }
    case 'AssistantLeader': {
      return 2;
    }
    case 'Participant': {
      return 0;
    }
    default: {
      return 1;
    }
  }
}

/**
 * Picks the role a participation is billed by.
 *
 * A participation with one role is billed by it, and one without any stays `unknown`, which
 * nothing prices. Only a person entered with several roles, say as Hauptleitung and as
 * Teilnehmer:in, needs a choice: the highest role the bill settings price. Choosing among the
 * priced ones first keeps an extra role nobody priced, a Küche say, from turning a billable
 * participant into an unbillable one. When none of them is priced the highest is kept, so
 * the refusal names a real role.
 */
export function resolveBilledRoleType(roleTypes: string[], rolePricingPatterns: string[]): string {
  const [firstRole, ...otherRoles] = roleTypes;
  if (firstRole === undefined) return 'unknown';
  if (otherRoles.length === 0) return firstRole;

  const priced = roleTypes.filter((roleType) => isRoleAllowed(roleType, rolePricingPatterns));
  const candidates = priced.length > 0 ? priced : roleTypes;
  // Ties keep the role Cevi.DB lists first, so the choice does not flip between syncs.
  return candidates.reduce((best, roleType) =>
    billedRoleRank(roleType) > billedRoleRank(best) ? roleType : best,
  );
}

const findAnswer = (
  answers: Record<string, string>,
  questionKeywords: string[],
): string | undefined => {
  const entry = Object.entries(answers).find(([qText]) =>
    questionKeywords.every((kw) => qText.toLowerCase().includes(kw.toLowerCase())),
  );
  return entry?.[1];
};

const checkAnswer = (
  answers: Record<string, string>,
  keywords: string[],
  fieldName: string,
  ctx: z.RefinementCtx,
): void => {
  const ans = findAnswer(answers, keywords);
  if (ans === undefined || ans.trim() === '') {
    ctx.addIssue({
      code: 'custom',
      message: fieldName,
      path: ['answers', fieldName],
    });
  }
};

const nullableNonEmptyString = (fieldName: string): z.ZodType =>
  z
    .union([z.string(), z.null(), z.undefined()])
    .transform((val) => (val ?? '').trim())
    .refine((val) => val.length > 0, { error: fieldName });

const PersonSchema = z.object({
  firstName: nullableNonEmptyString('Vorname'),
  lastName: nullableNonEmptyString('Nachname'),
  street: nullableNonEmptyString('Strasse'),
  housenumber: nullableNonEmptyString('Hausnummer'),
  zipCode: nullableNonEmptyString('PLZ'),
  town: nullableNonEmptyString('Ort'),
  country: nullableNonEmptyString('Land'),
  gender: nullableNonEmptyString('Geschlecht'),
  birthday: nullableNonEmptyString('Geburtsdatum'),
});

const AnswersSchema = z.record(z.string(), z.string());

const ParticipantValidationSchema = z
  .object({
    person: PersonSchema,
    answers: AnswersSchema,
  })
  .superRefine((data, ctx) => {
    checkAnswer(data.answers, ['ahv', 'nummer'], 'AHV-Nummer', ctx);
    checkAnswer(data.answers, ['t-shirt', 'grösse'], 'T-Shirt Grösse', ctx);

    const invoiceEmail =
      findAnswer(data.answers, ['mailadresse', 'rechnung']) ??
      findAnswer(data.answers, ['e-mail', 'rechnung']);
    if (
      invoiceEmail === undefined ||
      invoiceEmail.trim() === '' ||
      !z.email().safeParse(invoiceEmail.trim()).success
    ) {
      ctx.addIssue({
        code: 'custom',
        message: 'Mailadresse für Rechnung',
        path: ['answers', 'Mailadresse für Rechnung'],
      });
    }

    checkAnswer(data.answers, ['krankenkasse'], 'Krankenkasse Name', ctx);

    const versichertennummer =
      findAnswer(data.answers, ['versichertennummer']) ??
      findAnswer(data.answers, ['nummer', 'krankenkasse']);
    if (versichertennummer === undefined || versichertennummer.trim() === '') {
      ctx.addIssue({
        code: 'custom',
        message: 'Versichertennummer',
        path: ['answers', 'Versichertennummer'],
      });
    }

    const emergencyName =
      findAnswer(data.answers, ['notfallkontakt', 'name']) ??
      findAnswer(data.answers, ['notfallkontakt', 'vollständig']);
    if (emergencyName === undefined || emergencyName.trim() === '') {
      ctx.addIssue({
        code: 'custom',
        message: 'Notfallkontakt Name',
        path: ['answers', 'Notfallkontakt Name'],
      });
    }

    const emergencyPhone =
      findAnswer(data.answers, ['notfallkontakt', 'telefon']) ??
      findAnswer(data.answers, ['notfallkontakt', 'nummer']);
    if (emergencyPhone === undefined || emergencyPhone.trim() === '') {
      ctx.addIssue({
        code: 'custom',
        message: 'Notfallkontakt Telefonnummer',
        path: ['answers', 'Notfallkontakt Telefonnummer'],
      });
    }

    checkAnswer(data.answers, ['essgewohnheit'], 'Essgewohnheit', ctx);

    // The Hof decides here whether a registration is confirmed; without it we do not know
    // what we would be billing, so an empty answer blocks the bill like any other
    // Pflichtangabe.
    checkAnswer(data.answers, ['anmeldestatus'], 'Anmeldestatus', ctx);
  });

/**
 * Validates that all required fields (Pflichtangaben) are present on the participant using Zod.
 */
export function validateParticipant(input: ParticipantValidationInput): ValidationResult {
  const result = ParticipantValidationSchema.safeParse(input);
  if (!result.success) {
    const missingFields: string[] = [];
    const missingStammdaten: string[] = [];
    const missingAnmeldeangaben: string[] = [];

    for (const issue of result.error.issues) {
      const fieldName = issue.message;
      missingFields.push(fieldName);

      if (issue.path[0] === 'person') {
        missingStammdaten.push(fieldName);
      } else if (issue.path[0] === 'answers') {
        missingAnmeldeangaben.push(fieldName);
      }
    }

    return {
      isValid: false,
      missingFields,
      missingStammdaten,
      missingAnmeldeangaben,
    };
  }
  return {
    isValid: true,
    missingFields: [],
    missingStammdaten: [],
    missingAnmeldeangaben: [],
  };
}
