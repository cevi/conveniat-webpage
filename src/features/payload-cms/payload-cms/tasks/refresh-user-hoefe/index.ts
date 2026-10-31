import {
  cleanupCompletedScheduledJobs,
  cleanupStaleScheduledJobs,
  DEFAULT_QUEUE,
} from '@/features/payload-cms/payload-cms/tasks/cleanup-stale-jobs';
import {
  scheduleUnlessQueued,
  type ScheduleDecision,
} from '@/features/payload-cms/payload-cms/tasks/schedule-decision';
import { refreshUserHoefe } from '@/features/payload-cms/payload-cms/utils/hof-membership';
import type { PayloadRequest, TaskConfig } from 'payload';
import { countRunnableOrActiveJobsForQueue } from 'payload';

/**
 * Brings the Höfe stored on every user in line with their registrations, once a night and on
 * one worker. A registration's own hook keeps them current; this repairs what a failed hook
 * left behind. Runs after the three o'clock syncs, so it sees the registrations they wrote.
 */
export const refreshUserHoefeTask: TaskConfig<'refreshUserHoefe'> = {
  slug: 'refreshUserHoefe',
  retries: 0,
  schedule: [
    {
      cron: '0 4 * * *', // every night at four
      queue: DEFAULT_QUEUE,
      hooks: {
        beforeSchedule: async ({ queueable, req }): Promise<ScheduleDecision> => {
          await cleanupCompletedScheduledJobs(req, 'refreshUserHoefe');
          await cleanupStaleScheduledJobs(req, 'refreshUserHoefe', 60);

          const runnableOrActiveJobsForQueue = await countRunnableOrActiveJobsForQueue({
            queue: queueable.scheduleConfig.queue,
            req,
            taskSlug: 'refreshUserHoefe',
            onlyScheduled: true,
          });

          return scheduleUnlessQueued(runnableOrActiveJobsForQueue, queueable.waitUntil);
        },
      },
    },
  ],
  inputSchema: [],
  handler: async ({
    req: request,
  }: {
    req: PayloadRequest;
  }): Promise<{ output: Record<string, unknown> }> => {
    const { payload } = request;
    // without the request: a derived field, not an edit by whoever runs the job
    const written = await refreshUserHoefe(payload);
    payload.logger.info(
      { written },
      'Brought the Höfe of the users in line with their registrations',
    );
    return { output: { written } };
  },
};
