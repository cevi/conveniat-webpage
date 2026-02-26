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

  // Find Job Selection blocks
  const jobSelectionBlocks: { name: string }[] = [];

  const extractJobSelectionBlocks = (fields: unknown[]): void => {
    for (const field of fields) {
      if (!field || typeof field !== 'object') continue;
      const fieldBlock = field as { blockType?: string; name?: string; fields?: unknown[] };
      if (fieldBlock.blockType === 'jobSelection' && typeof fieldBlock.name === 'string') {
        jobSelectionBlocks.push({ name: fieldBlock.name });
      } else if (fieldBlock.blockType === 'conditionedBlock' && Array.isArray(fieldBlock.fields)) {
        extractJobSelectionBlocks(fieldBlock.fields);
      }
    }
  };

  for (const section of form.sections) {
    if (section.formSection.fields) {
      extractJobSelectionBlocks(section.formSection.fields);
    }
  }

  if (jobSelectionBlocks.length === 0) {
    return data;
  }

  const submissionData = (data.submissionData as SubmissionField[] | undefined) ?? [];
  const foundJobIds: string[] = [];

  for (const block of jobSelectionBlocks) {
    const submissionEntry = submissionData.find((entry) => entry.field === block.name);
    if (
      submissionEntry &&
      typeof submissionEntry.value === 'string' &&
      submissionEntry.value !== ''
    ) {
      foundJobIds.push(submissionEntry.value);
    }
  }

  if (foundJobIds.length === 0) {
    return data;
  }

  const locale = (req.locale as Locale | undefined) ?? 'en';

  for (const foundJobId of foundJobIds) {
    // Fetch the Job
    const job = (await req.payload.findByID({
      collection: 'helper-jobs',
      id: foundJobId,
    })) as unknown as { maxQuota?: number; id: string } | null;

    if (!job) {
      throw new APIError(selectedJobNotFoundMessage[locale], 400);
    }

    // Check Quota
    if (typeof job.maxQuota === 'number') {
      const currentSubmissionsCount = await req.payload.count({
        collection: 'form-submissions',
        where: {
          'helper-jobs': {
            contains: foundJobId,
          },
        },
      });

      if (currentSubmissionsCount.totalDocs >= job.maxQuota) {
        throw new APIError(jobFullMessage[locale], 400);
      }
    }
  }

  // Link the jobs to the submission
  data['helper-jobs'] = foundJobIds;

  return data;
};
