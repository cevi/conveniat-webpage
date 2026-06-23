import type { PayloadRequest, TaskConfig } from 'payload';

export const syncParticipantsTask: TaskConfig = {
  slug: 'syncParticipants',
  retries: 0,
  inputSchema: [],
  handler: async ({
    req,
  }: {
    req: PayloadRequest;
  }): Promise<{ output: Record<string, unknown> }> => {
    const { payload } = req;
    const { syncParticipants } = await import('@/features/billing/services/sync-service');
    const result = await syncParticipants(payload);

    return {
      output: {
        success: true,
        ...result,
      },
    };
  },
};
