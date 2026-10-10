import {
  cleanupCompletedScheduledJobs,
  cleanupStaleScheduledJobs,
  DEFAULT_QUEUE,
} from '@/features/payload-cms/payload-cms/tasks/cleanup-stale-jobs';
import {
  scheduleUnlessQueued,
  type ScheduleDecision,
} from '@/features/payload-cms/payload-cms/tasks/schedule-decision';
import type { PayloadRequest, TaskConfig } from 'payload';
import { countRunnableOrActiveJobsForQueue } from 'payload';

/**
 * Keeps the stored Cevi.DB browser session from timing out.
 *
 * Every ten minutes, because Hitobito ends a session after thirty without a request: two
 * runs may fail or be skipped during a rollout before the session is lost. See
 * `keepCeviDatabaseSessionAlive`.
 */
export const keepCeviDatabaseSessionAliveTask: TaskConfig<'keepCeviDbSessionAlive'> = {
  slug: 'keepCeviDbSessionAlive',
  retries: 0,
  schedule: [
    {
      cron: '*/10 * * * *',
      queue: DEFAULT_QUEUE,
      hooks: {
        beforeSchedule: async ({ queueable, req }): Promise<ScheduleDecision> => {
          await cleanupCompletedScheduledJobs(req, 'keepCeviDbSessionAlive');
          // One page request; a run still open after five minutes belongs to a replica
          // that is gone.
          await cleanupStaleScheduledJobs(req, 'keepCeviDbSessionAlive', 5);

          const runnableOrActiveJobsForQueue = await countRunnableOrActiveJobsForQueue({
            queue: queueable.scheduleConfig.queue,
            req,
            taskSlug: 'keepCeviDbSessionAlive',
            onlyScheduled: true,
          });

          return scheduleUnlessQueued(runnableOrActiveJobsForQueue, queueable.waitUntil);
        },
      },
    },
  ],
  inputSchema: [],
  handler: async ({
    req,
  }: {
    req: PayloadRequest;
  }): Promise<{ output: Record<string, unknown> }> => {
    const { keepCeviDatabaseSessionAlive } =
      await import('@/features/payload-cms/payload-cms/utils/cevidb-session-keepalive');
    const { redis } = await import('@/lib/db/redis');
    return { output: { session: await keepCeviDatabaseSessionAlive(req.payload, redis) } };
  },
};
