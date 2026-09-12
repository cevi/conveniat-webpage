import { RedisJobProgressAdapter } from '@/features/billing/adapters/redis-job-progress.adapter';
import { createJobProgressReporter } from '@/features/billing/services/job-progress-reporter';
import { BillingTaskSlug } from '@/features/billing/types';
import type { PayloadRequest, TaskConfig } from 'payload';

export const syncParticipantsTask: TaskConfig = {
  slug: 'syncParticipants',
  retries: 0,
  inputSchema: [],
  handler: async ({
    job,
    req,
  }: {
    job: { id: number | string };
    req: PayloadRequest;
  }): Promise<{ output: Record<string, unknown> }> => {
    const { payload } = req;
    const { syncParticipants } = await import('@/features/billing/services/sync-service');

    // The progress channel is best-effort decoration around the job, so a cancel flag
    // left over from a previous run is cleared here rather than trusted.
    const progressStore = new RedisJobProgressAdapter();
    await progressStore.clearCancel(BillingTaskSlug.SyncParticipants);
    const reporter = createJobProgressReporter(
      progressStore,
      BillingTaskSlug.SyncParticipants,
      String(job.id),
    );

    // Clearing the live record is the job of whoever holds the run lock, not of
    // every worker that reaches this handler — see `JobProgressReporter.finish`.
    const result = await syncParticipants(payload, reporter, String(job.id));

    return {
      output: {
        success: true,
        ...result,
      },
    };
  },
};
