import type { FormSubmission } from '@/features/payload-cms/payload-types';
import type { Payload } from 'payload';

export type JobStatus = 'pending' | 'success' | 'error';

export const updateWorkflowStatus = async (
  payload: Payload,
  formSubmissionId: string,
  workflow: string,
  status: JobStatus,
): Promise<void> => {
  const submission = await payload.findByID({
    collection: 'form-submissions',
    id: formSubmissionId,
    depth: 0,
  });

  const currentResults = Array.isArray(submission.workflowResults)
    ? (submission.workflowResults as Record<string, unknown>[])
    : [];
  const existingIndex = currentResults.findIndex((r) => r['workflow'] === workflow);

  if (existingIndex === -1) {
    currentResults.push({
      workflow,
      status,
      updatedAt: new Date().toISOString(),
    });
  } else {
    currentResults[existingIndex] = {
      ...currentResults[existingIndex],
      status,
      updatedAt: new Date().toISOString(),
    };
  }

  await payload.update({
    collection: 'form-submissions',
    id: formSubmissionId,
    data: {
      workflowResults: currentResults,
    } as Partial<FormSubmission>,
  });
};
