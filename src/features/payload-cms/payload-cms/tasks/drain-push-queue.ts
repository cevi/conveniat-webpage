import {
  cleanupCompletedScheduledJobs,
  cleanupStaleScheduledJobs,
  DEFAULT_QUEUE,
} from '@/features/payload-cms/payload-cms/tasks/cleanup-stale-jobs';
import {
  scheduleUnlessQueued,
  type ScheduleDecision,
} from '@/features/payload-cms/payload-cms/tasks/schedule-decision';
import { drainPushQueue } from '@/lib/push/push-queue';
import type { TaskConfig } from 'payload';
import { countRunnableOrActiveJobsForQueue } from 'payload';

/**
 * Sweeps the push delivery queue once a minute.
 *
 * The replica that queues a push sends it right away, so this is not how pushes normally go
 * out. It sends the retries that came due since, and the deliveries a replica left behind when
 * it stopped in the middle of a push, once their lease ran out. See `@/lib/push/push-queue`.
 */
export const drainPushQueueTask: TaskConfig<'drainPushQueue'> = {
  slug: 'drainPushQueue',
  retries: 0,
  schedule: [
    {
      cron: '* * * * *',
      queue: DEFAULT_QUEUE,
      hooks: {
        beforeSchedule: async ({ queueable, req }): Promise<ScheduleDecision> => {
          await cleanupCompletedScheduledJobs(req, 'drainPushQueue');
          // A sweep of an announcement's worth of deliveries takes well under a minute; one
          // still unfinished after ten belongs to a replica that is gone.
          await cleanupStaleScheduledJobs(req, 'drainPushQueue', 10);

          const runnableOrActiveJobsForQueue = await countRunnableOrActiveJobsForQueue({
            queue: queueable.scheduleConfig.queue,
            req,
            taskSlug: 'drainPushQueue',
            onlyScheduled: true,
          });

          return scheduleUnlessQueued(runnableOrActiveJobsForQueue, queueable.waitUntil);
        },
      },
    },
  ],
  inputSchema: [],
  handler: async (): Promise<{ output: Record<string, unknown> }> => {
    const summary = await drainPushQueue('all');
    return { output: { ...summary } };
  },
};
