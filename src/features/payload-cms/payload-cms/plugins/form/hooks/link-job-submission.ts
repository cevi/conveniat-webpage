import type { FormSubmission } from '@/features/payload-cms/payload-types';
import type { Locale, StaticTranslationString } from '@/types/types';
import type { CollectionBeforeChangeHook } from 'payload';
import { APIError } from 'payload';

interface SubmissionField {
  field: string;
  value: unknown;
}

const jobFullMessage: StaticTranslationString = {
  en: 'This job is already full.',
  de: 'Dieser Job ist bereits voll.',
  fr: 'Ce job est déjà complet.',
};

const selectedJobNotFoundMessage: StaticTranslationString = {
  en: 'Selected job not found.',
  de: 'Ausgewählter Job nicht gefunden.',
  fr: 'Job sélectionné non trouvé.',
};

const noJobSelectedMessage: StaticTranslationString = {
  en: 'no job selected',
  de: 'kein Job ausgewählt',
  fr: 'aucun job sélectionné',
};

/**
 * Recursively extracts the string names of all blocks that represent a Job Selection.
 */
const getJobSelectionBlockNames = (fields: unknown[] | null | undefined = []): string[] => {
  if (!fields || !Array.isArray(fields)) return [];
  return fields.reduce<string[]>((accumulator, field) => {
    if (!field || typeof field !== 'object') return accumulator;
    const f = field as { blockType?: string; name?: string; fields?: unknown[] | null };

    if (f.blockType === 'jobSelection' && typeof f.name === 'string') {
      accumulator.push(f.name);
    } else if (f.blockType === 'conditionedBlock' && Array.isArray(f.fields)) {
      accumulator.push(...getJobSelectionBlockNames(f.fields));
    }
    return accumulator;
  }, []);
};

/**
 * Validates the quota for a specific job selection.
 */
const validateJobQuota = async (
  request: Parameters<CollectionBeforeChangeHook<FormSubmission>>[0]['req'],
  jobId: string,
  maxQuota: number,
  locale: Locale,
): Promise<void> => {
  const currentSubmissionsCount = await request.payload.count({
    collection: 'form-submissions',
    where: {
      'helper-jobs': {
        contains: jobId,
      },
    },
  });

  if (currentSubmissionsCount.totalDocs >= maxQuota) {
    throw new APIError(jobFullMessage[locale], 400);
  }
};

export const linkJobSubmission: CollectionBeforeChangeHook<FormSubmission> = async ({
  data,
  req,
  operation,
}) => {
  if (operation !== 'create') {
    return data;
  }

  if (data.form === undefined) {
    return data;
  }

  // Fetch the Form definition to get the block configuration
  const formId = typeof data.form === 'object' ? data.form.id : data.form;
  const form = await req.payload.findByID({
    collection: 'forms',
    id: formId,
    depth: 1,
  });

  // Extract relevant job selection blocks from sections
  const blockNames = form.sections.flatMap(
    (section: { formSection?: { fields?: unknown[] | null } | null }) =>
      getJobSelectionBlockNames(section.formSection?.fields),
  );

  if (blockNames.length === 0) {
    return data;
  }

  const submissionData = (data.submissionData as SubmissionField[] | undefined) ?? [];
  const entriesToProcess = submissionData.filter((entry) => blockNames.includes(entry.field));

  if (entriesToProcess.length === 0) {
    return data;
  }

  const locale = (req.locale as Locale | undefined) ?? 'en';
  const foundJobIds: string[] = [];

  // Run database checks in parallel using Promise.all
  await Promise.all(
    entriesToProcess.map(async (submissionEntry) => {
      const isSelected = typeof submissionEntry.value === 'string' && submissionEntry.value !== '';

      if (!isSelected) {
        submissionEntry.value = noJobSelectedMessage[locale];
        return;
      }

      const jobId = submissionEntry.value as string;

      // Fetch the Job
      let job: { maxQuota?: number; id: string; title?: string };
      try {
        job = (await req.payload.findByID({
          collection: 'helper-jobs',
          id: jobId,
        })) as unknown as { maxQuota?: number; id: string; title?: string };
      } catch {
        throw new APIError(selectedJobNotFoundMessage[locale], 400);
      }

      // Check Quota if applicable
      if (typeof job.maxQuota === 'number') {
        await validateJobQuota(req, jobId, job.maxQuota, locale);
      }

      foundJobIds.push(jobId);
      submissionEntry.value = typeof job.title === 'string' ? job.title : jobId;
    }),
  );

  // Link the valid jobs to the submission
  if (foundJobIds.length > 0) {
    data['helper-jobs'] = foundJobIds;
  }

  return data;
};
