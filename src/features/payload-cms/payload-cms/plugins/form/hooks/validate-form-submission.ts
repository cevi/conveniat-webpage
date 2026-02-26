import type { Form, FormSubmission } from '@/features/payload-cms/payload-types';
import type { Locale, StaticTranslationString } from '@/types/types';
import { auth } from '@/utils/auth';
import type { CollectionBeforeChangeHook } from 'payload';
import { APIError } from 'payload';

type SectionFields = NonNullable<NonNullable<Form['sections']>[number]['formSection']>['fields'];
type SectionField = NonNullable<SectionFields>[number];

/** A leaf field — everything except conditionedBlock and message */
type ValidatableField = Exclude<SectionField, { blockType: 'conditionedBlock' | 'message' }>;

/**
 * Collect the fields that should actually be validated, respecting
 * conditionedBlock display conditions against the submitted data.
 */
function collectValidatableFields(
  fields: SectionField[],
  submissionDataMap: Map<string, string>,
): ValidatableField[] {
  const result: ValidatableField[] = [];

  for (const field of fields) {
    if (field.blockType === 'message') continue;

    if (field.blockType === 'conditionedBlock') {
      // Only include inner fields when the display condition holds
      const conditionField = field.displayCondition?.field;
      const conditionValue = field.displayCondition?.value;

      if (
        typeof conditionField === 'string' &&
        conditionField.length > 0 &&
        typeof conditionValue === 'string'
      ) {
        const actualValue = submissionDataMap.get(conditionField);
        const normalizedActualValue = String(actualValue ?? '');
        if (normalizedActualValue !== conditionValue) {
          continue; // condition not met → skip all inner fields
        }
      }

      // Condition met (or no condition defined) → recurse into inner fields
      if (field.fields) {
        // Inner fields cannot contain nested conditionedBlocks per the type,
        // but we cast via the same helper for safety.
        for (const inner of field.fields) {
          if ('blockType' in inner && inner.blockType !== 'message') {
            result.push(inner as ValidatableField);
          }
        }
      }
      continue;
    }

    // Regular field
    result.push(field);
  }

  return result;
}

export const validateFormSubmission: CollectionBeforeChangeHook<FormSubmission> = async ({
  data,
  req,
  operation,
}) => {
  if (operation !== 'create') return data;
  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
  if (!Array.isArray(data.submissionData) || !data.form) return data;

  const formId = typeof data.form === 'string' ? data.form : data.form.id;

  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
  if (!formId) return data;

  // Fetch the form definition
  const form = await req.payload.findByID({
    collection: 'forms',
    id: formId,
    depth: 1,
  });

  if (typeof form !== 'object') return data;

  // Build a map of submitted values for quick lookup
  const submissionDataMap = new Map<string, string>();
  for (const item of data.submissionData) {
    // Normalize values to string to prevent runtime type mismatch (e.g. booleans from checkboxes) bypassing validation
    const rawValue = item.value as unknown;
    let normalizedValue = '';
    if (typeof rawValue === 'string') {
      normalizedValue = rawValue;
    } else if (typeof rawValue === 'number' || typeof rawValue === 'boolean') {
      normalizedValue = String(rawValue);
    } else if (Array.isArray(rawValue)) {
      normalizedValue = rawValue.join(', ');
    }
    submissionDataMap.set(item.field, normalizedValue);
  }

  // Collect validatable fields from all sections, respecting conditions
  const allFields: ValidatableField[] = [];
  for (const section of form.sections) {
    if (section.formSection.fields) {
      allFields.push(...collectValidatableFields(section.formSection.fields, submissionDataMap));
    }
  }

  const fieldErrors: { field: string; message: string }[] = [];

  interface CeviDatabaseSession {
    user?: {
      cevi_db_uuid?: string;
      uuid?: string;
      name?: string;
      nickname?: string;
      email?: string;
      [key: string]: unknown;
    };
  }

  let session: CeviDatabaseSession | null | undefined;
  let sessionFetched = false;
  const getSession = async (): Promise<CeviDatabaseSession | null | undefined> => {
    if (!sessionFetched) {
      session = (await auth()) as CeviDatabaseSession | null | undefined;
      sessionFetched = true;
    }
    return session;
  };

  for (const fieldConfig of allFields) {
    // Ensure the field has a name
    if (!('name' in fieldConfig) || typeof fieldConfig.name !== 'string') {
      continue;
    }

    const fieldName = fieldConfig.name;
    const value = submissionDataMap.get(fieldName);
    let hasValue = value !== undefined && value !== '';

    if (fieldConfig.blockType === 'checkbox') {
      // Treat 'false' as empty so that required checkboxes must be explicitly checked ('true').
      hasValue = String(value) === 'true';
    }

    // Check required (respecting the flag — only validate if required === true)
    const isRequired = 'required' in fieldConfig && fieldConfig.required === true;
    if (isRequired && !hasValue) {
      if (fieldConfig.blockType === 'ceviDbLogin') {
        const locale = (req.locale ?? 'en') as Locale;
        const requiredMessage: StaticTranslationString = {
          en: `Field "${fieldName}" is required. Please log in with Cevi DB.`,
          de: `Feld "${fieldName}" ist erforderlich. Bitte melden Sie sich mit Cevi DB an.`,
          fr: `Le champ "${fieldName}" ist obligatoire. Veuillez vous connecter avec Cevi DB.`,
        };
        throw new APIError(requiredMessage[locale], 400, undefined, true);
      } else {
        fieldErrors.push({ field: fieldName, message: 'required' });
        continue;
      }
    }

    if (!hasValue || typeof value !== 'string') continue;

    // Type-specific validation
    switch (fieldConfig.blockType) {
      case 'ceviDbLogin': {
        const locale = (req.locale ?? 'en') as Locale;
        const currentSession = await getSession();

        if (currentSession?.user === undefined) {
          const loginRequiredMessage: StaticTranslationString = {
            en: 'You must be logged in to submit this field.',
            de: 'Sie müssen angemeldet sein, um dieses Feld abzusenden.',
            fr: 'Vous devez être connecté pour soumettre ce champ.',
          };
          throw new APIError(loginRequiredMessage[locale], 401, undefined, true);
        }

        let sessionValue: string | number | undefined | null;
        const saveField = 'saveField' in fieldConfig ? (fieldConfig.saveField as string) : 'email';

        switch (saveField) {
          case 'uuid': {
            sessionValue = currentSession.user.cevi_db_uuid ?? currentSession.user.uuid;
            break;
          }
          case 'name': {
            sessionValue = currentSession.user.name;
            break;
          }
          case 'nickname': {
            sessionValue = currentSession.user.nickname;
            break;
          }
          default: {
            sessionValue = currentSession.user.email;
            break;
          }
        }

        const sessionString = String(sessionValue ?? '').trim();

        if (value !== sessionString) {
          const integrityMessage: StaticTranslationString = {
            en: `Validation failed for field "${fieldName}". The submitted value does not match your logged-in user.`,
            de: `Validierung fehlgeschlagen für Feld "${fieldName}". Der übermittelte Wert stimmt nicht mit Ihrem angemeldeten Benutzer überein.`,
            fr: `La validation a échoué pour le champ "${fieldName}". La valeur soumise ne correspond pas à votre utilisateur connecté.`,
          };
          throw new APIError(integrityMessage[locale], 403, undefined, true);
        }
        break;
      }
      case 'email': {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          fieldErrors.push({
            field: fieldName,
            message: 'invalid_email',
          });
        }
        break;
      }
      case 'number': {
        if (Number.isNaN(Number(value))) {
          fieldErrors.push({ field: fieldName, message: 'invalid_number' });
        }
        break;
      }
      case 'date': {
        if (Number.isNaN(Date.parse(value))) {
          fieldErrors.push({ field: fieldName, message: 'invalid_date' });
        }
        break;
      }
      case 'text': {
        if (
          'inputValidation' in fieldConfig &&
          typeof fieldConfig.inputValidation === 'string' &&
          fieldConfig.inputValidation.length > 0
        ) {
          try {
            const regex = new RegExp(fieldConfig.inputValidation);
            if (!regex.test(value)) {
              fieldErrors.push({
                field: fieldName,
                message: fieldConfig.inputValidationErrorMessage ?? 'invalid_format',
              });
            }
          } catch {
            // Invalid regex in form config; skip regex-based validation for this field.
          }
        }
        break;
      }
      case 'select': {
        if ('options' in fieldConfig && Array.isArray(fieldConfig.options)) {
          const allowedValues = new Set(
            fieldConfig.options.map((opt: { value: string }) => opt.value),
          );
          // Multi-select values are stored as comma-separated strings
          const submittedValues = value.split(', ').map((v) => v.trim());
          const invalidValues = submittedValues.filter((v) => !allowedValues.has(v));
          if (invalidValues.length > 0) {
            fieldErrors.push({
              field: fieldName,
              message: 'invalid_selection',
            });
          }
        }
        break;
      }
      // jobSelection, checkbox, country, textarea:
      // no extra type-specific validation needed beyond the required check above
    }
  }

  if (fieldErrors.length > 0) {
    throw new APIError(
      'Validation Error',
      400,
      fieldErrors as unknown as Record<string, unknown>[],
      true,
    );
  }

  return data;
};
