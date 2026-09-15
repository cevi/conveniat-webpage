import { RedisJobProgressAdapter } from '@/features/billing/adapters/redis-job-progress.adapter';
import { createJobProgressReporter } from '@/features/billing/services/job-progress-reporter';
import { BillingTaskSlug } from '@/features/billing/types';
import {
  cleanupStaleScheduledJobs,
  DEFAULT_QUEUE,
} from '@/features/payload-cms/payload-cms/tasks/cleanup-stale-jobs';
import type { PayloadRequest, TaskConfig } from 'payload';

export const syncParticipantsTask: TaskConfig = {
  slug: 'syncParticipants',
  retries: 0,
  // The Cevi.DB is the source of truth for who is coming, and an operator pressing
  // "Teilnehmer abgleichen" was the only thing that ever brought those changes across.
  // A nightly run at 03:00 (container local time) means the billing views are at most a
  // day behind without anyone remembering to click.
  schedule: [
    {
      cron: '0 3 * * *',
      queue: DEFAULT_QUEUE,
      hooks: {
        beforeSchedule: async ({
          req,
        }): Promise<{ shouldSchedule: boolean; input: Record<string, never> }> => {
          // A sync holds its run lock for at most two hours, so anything incomplete after
          // three is a crash-orphaned job that would block the scheduler forever.
          // Completed jobs are deliberately *not* cleaned up: the billing toolbar reads
          // the latest job of this task to show the result of the last sync, and deleting
          // the scheduled runs would leave that panel empty.
          await cleanupStaleScheduledJobs(req, 'syncParticipants', 3 * 60);

          // Concurrent runs are already serialised by the Redis run lock keyed on the job
          // id, so no extra guard is needed here.
          return { shouldSchedule: true, input: {} };
        },
      },
    },
  ],
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
