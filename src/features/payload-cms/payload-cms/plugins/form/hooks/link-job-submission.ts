import type { FormSubmission } from '@/features/payload-cms/payload-types';
import type { CollectionBeforeChangeHook } from 'payload';
import { APIError } from 'payload';

interface SubmissionField {
  field: string;
  value: unknown;
}

export const linkJobSubmission: CollectionBeforeChangeHook<FormSubmission> = async ({
  data,
  req,
  operation,
}) => {
  if (operation !== 'create') {
    return data;
  }

  if (!data.form) {
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

  for (const section of form.sections) {
    const fields = section.formSection.fields;
    if (!fields) continue;

    for (const field of fields) {
      const fieldBlock = field as { blockType: string; name?: string };
      if (fieldBlock.blockType === 'jobSelection' && typeof fieldBlock.name === 'string') {
        jobSelectionBlocks.push({ name: fieldBlock.name });
      }
    }
  }

  if (jobSelectionBlocks.length === 0) {
    return data;
  }

  const submissionData = (data.submissionData as SubmissionField[] | undefined) ?? [];
  let foundJobId: string | undefined;

  for (const block of jobSelectionBlocks) {
    const submissionEntry = submissionData.find((entry) => entry.field === block.name);
    if (submissionEntry?.value) {
      foundJobId = submissionEntry.value as string;
      break; // Assuming only one job selection per form for now, or take the first one
    }
  }

  if (!foundJobId) {
    return data;
  }

  // Fetch the Job

  const job = (await req.payload.findByID({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: 'jobs' as any,
    id: foundJobId,
  })) as unknown as { maxQuota?: number; id: string } | null;

  if (!job) {
    throw new APIError('Selected job not found.', 400);
  }

  // Check Quota
  if (typeof job.maxQuota === 'number') {
    const currentSubmissionsCount = await req.payload.count({
      collection: 'form-submissions',
      where: {
        job: {
          equals: foundJobId,
        },
      },
    });

    if (currentSubmissionsCount.totalDocs >= job.maxQuota) {
      throw new APIError('This job is already full.', 400);
    }
  }

  // Link the job to the submission
  // We need to cast data to any because 'job' might not be in the type definition yet if we haven't generated types
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
  (data as any).job = foundJobId;

  return data;
};
