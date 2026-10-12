import type { TaskConfig } from 'payload';

export const blockJobStep: TaskConfig<{
  input: { workflowSlug: string; originalInput: unknown; reason: string };
  output: { blocked: boolean };
}> = {
  slug: 'blockJob',
  retries: 3,
  inputSchema: [
    {
      name: 'workflowSlug',
      type: 'text',
    },
    {
      name: 'reason',
      type: 'text',
    },
    {
      name: 'originalInput',
      type: 'json',
    },
  ],
  outputSchema: [
    {
      name: 'blocked',
      type: 'checkbox',
    },
  ],
  handler: async ({ input, job, req }) => {
    const { payload } = req;

    // Create a blocked job entry
    await payload.create({
      collection: 'blocked-jobs',
      data: {
        originalJobId: job.id,
        workflowSlug: input.workflowSlug,
        input: input.originalInput as Record<string, unknown>,
        reason: input.reason,
        status: 'pending',
      },
    });

    payload.logger.info(`Created blocked job for workflow '${input.workflowSlug}'.`);

    // Return blocked=true to signal the workflow to end gracefully
    return {
      output: {
        blocked: true,
      },
    };
  },
};
