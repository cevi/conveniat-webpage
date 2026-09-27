import { getFormBlockNames } from '@/features/payload-cms/payload-cms/plugins/form/form-block-names';
import type { FormSubmission } from '@/features/payload-cms/payload-types';
import type { Locale, StaticTranslationString } from '@/types/types';
import type { CollectionBeforeChangeHook } from 'payload';
import { APIError } from 'payload';

interface SubmissionField {
  field: string;
  value: unknown;
}

const selectedHofNotFoundMessage: StaticTranslationString = {
  en: 'The selected Hof does not exist.',
  de: 'Der ausgewählte Hof existiert nicht.',
  fr: "Le Hof sélectionné n'existe pas.",
};

/**
 * Links a new submission to the Hof picked in its Hof selection, so the Hof finds it on its
 * dashboard, and writes the Hof's name into the answer so the emails and the admin read it.
 * A new submission gets no other Hof.
 */
export const linkHofSubmission: CollectionBeforeChangeHook<FormSubmission> = async ({
  data,
  req,
  operation,
}) => {
  if (operation !== 'create') return data;
  // Anyone may create a submission, so a Hof sent along with it is not taken at its word: only
  // the Hof picked in the form links it. Editors link older submissions afterwards, by update.
  delete data.hof;
  if (data.form === undefined) return data;

  const formId = typeof data.form === 'object' ? data.form.id : data.form;
  const form = await req.payload.findByID({ collection: 'forms', id: formId, depth: 0, req });
  const names = form.sections.flatMap((section) =>
    getFormBlockNames(section.formSection.fields as unknown[] | null | undefined, 'hofSelection'),
  );
  if (names.length === 0) return data;

  const answers = Array.isArray(data.submissionData)
    ? (data.submissionData as SubmissionField[])
    : [];
  const hofId = answers.find(
    (answer) =>
      names.includes(answer.field) && typeof answer.value === 'string' && answer.value !== '',
  )?.value as string | undefined;
  if (hofId === undefined) return data;

  const hof = await req.payload.findByID({
    collection: 'hoefe',
    id: hofId,
    depth: 0,
    disableErrors: true,
    overrideAccess: true,
    select: { name: true },
    req,
  });
  if (hof === null) {
    const locale = (req.locale as Locale | undefined) ?? 'de';
    throw new APIError(selectedHofNotFoundMessage[locale], 400);
  }

  for (const answer of answers) {
    if (names.includes(answer.field) && answer.value === hofId) answer.value = hof.name;
  }
  data.hof = hof.id;
  return data;
};
