import { RedisJobProgressAdapter } from '@/features/billing/adapters/redis-job-progress.adapter';
import { createJobProgressReporter } from '@/features/billing/services/job-progress-reporter';
import { BillingTaskSlug } from '@/features/billing/types';
import {
  cleanupStaleScheduledJobs,
  DEFAULT_QUEUE,
} from '@/features/payload-cms/payload-cms/tasks/cleanup-stale-jobs';
import {
  scheduleUnlessQueued,
  skipSchedule,
  type ScheduleDecision,
} from '@/features/payload-cms/payload-cms/tasks/schedule-decision';
import { redis } from '@/lib/db/redis';
import type { PayloadRequest, TaskConfig } from 'payload';
import { countRunnableOrActiveJobsForQueue } from 'payload';

/**
 * How long one occurrence stays claimed in Redis. Only the seconds around the scheduling
 * decision matter — by the time it expires, the queued job itself is what stops a second
 * one from being created.
 */
const SCHEDULE_SLOT_TTL_MS = 5 * 60 * 1000;

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
        beforeSchedule: async ({ queueable, req }): Promise<ScheduleDecision> => {
          // A sync holds its run lock for at most two hours, so anything incomplete after
          // three is a crash-orphaned job that would block the scheduler forever.
          // Completed jobs are deliberately *not* cleaned up: the billing toolbar reads
          // the latest job of this task to show the result of the last sync, and deleting
          // the scheduled runs would leave that panel empty.
          await cleanupStaleScheduledJobs(req, 'syncParticipants', 3 * 60);

          // Both replicas poll the queue on the same ten-second cron, so they reach the
          // count below in the same instant and both see zero. Claiming the occurrence in
          // Redis first means only one of them queues it; the loser would otherwise add a
          // second nightly sync that the run lock refuses at 03:00 and that leaves an
          // error on the billing toolbar for the operator to puzzle over.
          const occurrence = queueable.waitUntil?.toISOString() ?? 'immediate';
          const slotKey = `syncParticipants:schedule-lock:${occurrence}`;
          let hasSlot = true;
          try {
            hasSlot = (await redis.set(slotKey, '1', 'PX', SCHEDULE_SLOT_TTL_MS, 'NX')) === 'OK';
          } catch (error) {
            // Redis being unreachable must not cost us the nightly sync: the count below
            // still catches the duplicate on every poll after the first.
            req.payload.logger.error({
              err: error instanceof Error ? error : new Error(String(error)),
              msg: 'Failed to claim the syncParticipants schedule slot. Falling back to the job count.',
            });
          }

          if (!hasSlot) return skipSchedule();

          // The Redis run lock serialises two workers picking up the *same* job. It says
          // nothing about how many jobs exist, so the scheduler still has to count: an
          // occurrence that is already queued or in flight is this one.
          const runnableOrActiveJobsForQueue = await countRunnableOrActiveJobsForQueue({
            queue: queueable.scheduleConfig.queue,
            req,
            taskSlug: 'syncParticipants',
            onlyScheduled: true,
          });

          return scheduleUnlessQueued(runnableOrActiveJobsForQueue, queueable.waitUntil);
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
