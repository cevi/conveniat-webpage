import {
  areRangesAllowed,
  parseDateRangesValue,
} from '@/features/payload-cms/components/form/utils/date-slots';
import {
  getJobPeriodFieldName,
  getJobSelectableDays,
} from '@/features/payload-cms/components/form/utils/job-period';
import { getFormBlockNames } from '@/features/payload-cms/payload-cms/plugins/form/form-block-names';
import { formRefusal } from '@/features/payload-cms/payload-cms/plugins/form/hooks/form-refusal';
import type { FormSubmission, HelperJob } from '@/features/payload-cms/payload-types';
import type { Locale, StaticTranslationString } from '@/types/types';
import type { CollectionBeforeChangeHook } from 'payload';
import { APIError } from 'payload';

interface SubmissionField {
  field: string;
  value: unknown;
}

const noJobSelectedMessage: StaticTranslationString = {
  en: '-',
  de: '-',
  fr: '-',
};

/**
 * Validates the quota for a specific job selection.
 */
const validateJobQuota = async (
  request: Parameters<CollectionBeforeChangeHook<FormSubmission>>[0]['req'],
  jobId: string,
  maxQuota: number,
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
    throw formRefusal(request, 400, 'jobFull');
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
      getFormBlockNames(section.formSection?.fields, 'jobSelection'),
  );

  if (blockNames.length === 0) {
    return data;
  }

  const submissionData = Array.isArray(data.submissionData)
    ? (data.submissionData as SubmissionField[])
    : [];

  // If a job selection is within an optional block and not selected, its field
  // is completely missing from submissionData. Append missing fields as empty.
  for (const blockName of blockNames) {
    if (!submissionData.some((entry) => entry.field === blockName)) {
      submissionData.push({ field: blockName, value: '' });
    }
  }

  data.submissionData = submissionData as NonNullable<FormSubmission['submissionData']>;

  const entriesToProcess = submissionData.filter((entry) => blockNames.includes(entry.field));

  if (entriesToProcess.length === 0) {
    return data;
  }

  const locale = (req.locale as Locale | undefined) ?? 'en';
  const foundJobIds: string[] = [];
  const periodErrors: { field: string; message: string }[] = [];
  /** Days sent for a job that lasts its whole window, or for no job: not an answer. */
  const strayPeriodFields = new Set<string>();

  // Run database checks in parallel using Promise.all
  await Promise.all(
    entriesToProcess.map(async (submissionEntry) => {
      const isSelected = typeof submissionEntry.value === 'string' && submissionEntry.value !== '';

      const periodFieldName = getJobPeriodFieldName(submissionEntry.field);

      if (!isSelected) {
        submissionEntry.value = noJobSelectedMessage[locale];
        strayPeriodFields.add(periodFieldName);
        return;
      }

      const jobId = submissionEntry.value as string;

      // Fetch the Job
      let job: HelperJob;
      try {
        job = await req.payload.findByID({
          collection: 'helper-jobs',
          id: jobId,
        });
      } catch {
        throw formRefusal(req, 400, 'jobNotFound');
      }

      // A job with a minimum duration needs the helper's own days, within its window.
      const selectable = getJobSelectableDays(job);
      if (selectable === undefined) {
        strayPeriodFields.add(periodFieldName);
      } else {
        const periodValue = submissionData.find((entry) => entry.field === periodFieldName)?.value;
        const ranges = parseDateRangesValue(periodValue);
        if (typeof periodValue !== 'string' || periodValue === '') {
          periodErrors.push({ field: periodFieldName, message: 'required' });
        } else if (ranges === undefined || !areRangesAllowed(ranges, selectable)) {
          periodErrors.push({ field: periodFieldName, message: 'invalid_selection' });
        }
      }

      // Check Quota if applicable
      if (typeof job.maxQuota === 'number') {
        await validateJobQuota(req, jobId, job.maxQuota);
      }

      foundJobIds.push(jobId);
      submissionEntry.value = typeof job.title === 'string' ? job.title : jobId;
    }),
  );

  if (periodErrors.length > 0) {
    throw new APIError('Validation Error', 400, periodErrors, true);
  }
  data.submissionData = submissionData.filter(
    (entry) => !strayPeriodFields.has(entry.field),
  ) as NonNullable<FormSubmission['submissionData']>;

  // Link the valid jobs to the submission
  if (foundJobIds.length > 0) {
    data['helper-jobs'] = foundJobIds;
  }

  return data;
};
