import type { FormSubmission } from '@/features/payload-cms/payload-types';
import { auth } from '@/utils/auth';
import type { CollectionBeforeChangeHook } from 'payload';
import { APIError } from 'payload';

export const validateCeviDatabaseLogin: CollectionBeforeChangeHook<FormSubmission> = async ({
  data,
  req,
}) => {
  if (!data.form) {
    return data;
  }

  // Fetch the form definition to get the block configuration
  const formId = typeof data.form === 'object' ? data.form.id : data.form;
  const form = await req.payload.findByID({
    collection: 'forms',
    id: formId,
    depth: 1, // Need depth to see block fields
  });

  // Find all Cevi DB Login blocks in the form
  const ceviDatabaseBlocks: { name: string; skippable?: boolean; saveField?: string }[] = [];

  for (const section of form.sections) {
    const fields = section.formSection.fields;
    if (!fields) {
      continue;
    }

    for (const field of fields) {
      if (field.blockType === 'ceviDbLogin') {
        const skippable = 'skippable' in field ? (field.skippable as boolean) : false;
        const saveField = 'saveField' in field ? (field.saveField as string) : 'email';

        ceviDatabaseBlocks.push({
          name: field.name,
          skippable,
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
  const submissionData = data.submissionData ?? [];

  for (const block of ceviDatabaseBlocks) {
    const submissionEntry = submissionData.find((entry) => entry.field === block.name);
    const submittedValue = submissionEntry?.value;

    // undefined or null or empty string check
    const isEmpty = submittedValue === undefined || submittedValue === '';

    if (isEmpty) {
      if (!block.skippable) {
        throw new APIError(
          `Field "${block.name}" is required. Please log in with Cevi DB.`,
          400,
          undefined,
          true,
        );
      }
      // If skippable and empty, we're good
      continue;
    }

    // If value is present, we must validate it against the session
    if (!session?.user) {
      // Value present but no session? Suspicious or expired session.
      throw new APIError('You must be logged in to submit this field.', 401, undefined, true);
    }

    let sessionValue: string | number | undefined | null;

    switch (block.saveField) {
      case 'uuid': {
        sessionValue = session.user.uuid;
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
    // Form submissions are usually strings.
    const submittedString = String(submittedValue).trim();
    const sessionString = String(sessionValue ?? '').trim();

    if (submittedString !== sessionString) {
      throw new APIError(
        `Validation failed for field "${block.name}". The submitted value does not match your logged-in user.`,
        403,
        undefined,
        true,
      );
    }
  }

  return data;
};
