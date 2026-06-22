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
}

/**
 * Checks if the event participation role is allowed for billing.
 */
export function isRoleAllowed(roleType: string | null | undefined): boolean {
  const allowedRoles = [
    'Event::Role::Participant',
    'Event::Role::Leader',
    'Event::Role::AssistantLeader',
  ];
  return allowedRoles.includes(roleType ?? '');
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
      code: z.ZodIssueCode.custom,
      message: fieldName,
      path: ['answers', fieldName],
    });
  }
};

const nullableNonEmptyString = (fieldName: string): z.ZodTypeAny =>
  z
    .union([z.string(), z.null(), z.undefined()])
    .transform((val) => (val ?? '').trim())
    .refine((val) => val.length > 0, { message: fieldName });

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
    if (invoiceEmail === undefined || invoiceEmail.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
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
        code: z.ZodIssueCode.custom,
        message: 'Versichertennummer',
        path: ['answers', 'Versichertennummer'],
      });
    }

    const emergencyName =
      findAnswer(data.answers, ['notfallkontakt', 'name']) ??
      findAnswer(data.answers, ['notfallkontakt', 'vollständig']);
    if (emergencyName === undefined || emergencyName.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Notfallkontakt Name',
        path: ['answers', 'Notfallkontakt Name'],
      });
    }

    const emergencyPhone =
      findAnswer(data.answers, ['notfallkontakt', 'telefon']) ??
      findAnswer(data.answers, ['notfallkontakt', 'nummer']);
    if (emergencyPhone === undefined || emergencyPhone.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Notfallkontakt Telefonnummer',
        path: ['answers', 'Notfallkontakt Telefonnummer'],
      });
    }

    checkAnswer(data.answers, ['essgewohnheit'], 'Essgewohnheit', ctx);
  });

/**
 * Validates that all required fields (Pflichtangaben) are present on the participant using Zod.
 */
export function validateParticipant(input: ParticipantValidationInput): ValidationResult {
  const result = ParticipantValidationSchema.safeParse(input);
  if (!result.success) {
    const missingFields = result.error.issues.map((issue) => issue.message);
    return {
      isValid: false,
      missingFields,
    };
  }
  return {
    isValid: true,
    missingFields: [],
  };
}
