import type { FormSubmission } from '@/features/payload-cms/payload-types';
import type { Locale, StaticTranslationString } from '@/types/types';
import { auth } from '@/utils/auth';
import type { CollectionBeforeChangeHook } from 'payload';
import { APIError } from 'payload';

export const validateCeviDatabaseLogin: CollectionBeforeChangeHook<FormSubmission> = async ({
  data,
  req,
}) => {
  // Fetch the form definition to get the block configuration
  const formId = typeof data.form === 'object' ? data.form.id : data.form;
  if (formId === undefined) {
    return data;
  }

  const form = await req.payload.findByID({
    collection: 'forms',
    id: formId,
    depth: 1,
  });

  // Find all Cevi DB Login blocks in the form
  const ceviDatabaseBlocks: { name: string; required?: boolean; saveField?: string }[] = [];

  for (const section of form.sections) {
    const fields = section.formSection.fields;
    if (fields === null || fields === undefined) {
      continue;
    }

    for (const field of fields) {
      if (field.blockType === 'ceviDbLogin') {
        const required = 'required' in field ? (field.required as boolean) : false;
        const saveField = 'saveField' in field ? (field.saveField as string) : 'email';

        ceviDatabaseBlocks.push({
          name: field.name,
          required,
          saveField,
        });
      }
    }
  }

  if (ceviDatabaseBlocks.length === 0) {
    return data;
  }

  // Check session
  const session = await auth();

  interface SubmissionField {
    field: string;
    value: unknown;
  }

  const submissionData = (data.submissionData as SubmissionField[] | undefined) ?? [];

  const locale = (req.locale ?? 'en') as Locale;

  for (const block of ceviDatabaseBlocks) {
    const submissionEntry = submissionData.find((entry) => entry.field === block.name);
    const submittedValue = submissionEntry?.value;

    // undefined or null or empty string check
    const isEmpty = submittedValue === undefined || submittedValue === '';

    const requiredMessage: StaticTranslationString = {
      en: `Field "${block.name}" is required. Please log in with Cevi DB.`,
      de: `Feld "${block.name}" ist erforderlich. Bitte melden Sie sich mit Cevi DB an.`,
      fr: `Le champ "${block.name}" ist obligatoire. Veuillez vous connecter avec Cevi DB.`,
    };

    const loginRequiredMessage: StaticTranslationString = {
      en: 'You must be logged in to submit this field.',
      de: 'Sie müssen angemeldet sein, um dieses Feld abzusenden.',
      fr: 'Vous devez être connecté pour soumettre ce champ.',
    };

    const integrityMessage: StaticTranslationString = {
      en: `Validation failed for field "${block.name}". The submitted value does not match your logged-in user.`,
      de: `Validierung fehlgeschlagen für Feld "${block.name}". Der übermittelte Wert stimmt nicht mit Ihrem angemeldeten Benutzer überein.`,
      fr: `La validation a échoué pour le champ "${block.name}". La valeur soumise ne correspond pas à votre utilisateur connecté.`,
    };

    if (isEmpty) {
      if (block.required === true) {
        throw new APIError(requiredMessage[locale], 400, undefined, true);
      }
      continue; // If not required and empty, we're good
    }

    if (session?.user === undefined) {
      throw new APIError(loginRequiredMessage[locale], 401, undefined, true);
    }

    let sessionValue: string | number | undefined | null;

    switch (block.saveField) {
      case 'uuid': {
        sessionValue = session.user.cevi_db_uuid ?? session.user.uuid;
        break;
      }
      case 'name': {
        sessionValue = session.user.name;
        break;
      }
      case 'nickname': {
        sessionValue = session.user.nickname;
        break;
      }
      default: {
        sessionValue = session.user.email;
        break;
      }
    }

    // Normalize comparison
    const submittedString =
      typeof submittedValue === 'object' && submittedValue !== null
        ? JSON.stringify(submittedValue)
        : String(submittedValue as string | number | boolean | null | undefined);

    const sessionString = String(sessionValue ?? '').trim();

    if (submittedString !== sessionString) {
      throw new APIError(integrityMessage[locale], 403, undefined, true);
    }
  }

  return data;
};
