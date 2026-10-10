import { environmentVariables } from '@/config/environment-variables';
import {
  cleanupCompletedScheduledJobs,
  cleanupStaleScheduledJobs,
  MAIL_QUEUE,
} from '@/features/payload-cms/payload-cms/tasks/cleanup-stale-jobs';
import {
  scheduleUnlessQueued,
  type ScheduleDecision,
} from '@/features/payload-cms/payload-cms/tasks/schedule-decision';
import type { PayloadRequest, TaskConfig } from 'payload';
import { countRunnableOrActiveJobsForQueue } from 'payload';

/**
 * Sends what is waiting in the outgoing mail queue, once a minute.
 *
 * Bills, Pflichtangaben reminders and the weekly report are queued rather than sent, and
 * this is the only place they leave from. It sends as many as the hourly budget for
 * background mail allows and leaves the rest for the next minute. See `email-outbox`.
 */
export const drainEmailOutboxTask: TaskConfig<'drainEmailOutbox'> = {
  slug: 'drainEmailOutbox',
  retries: 0,
  schedule: [
    {
      cron: '* * * * *',
      queue: MAIL_QUEUE,
      hooks: {
        beforeSchedule: async ({ queueable, req }): Promise<ScheduleDecision> => {
          await cleanupCompletedScheduledJobs(req, 'drainEmailOutbox');
          // Matches the drain's own lock: a run still unfinished after that long belongs
          // to a replica that is gone.
          await cleanupStaleScheduledJobs(req, 'drainEmailOutbox', 10);

          const runnableOrActiveJobsForQueue = await countRunnableOrActiveJobsForQueue({
            queue: queueable.scheduleConfig.queue,
            req,
            taskSlug: 'drainEmailOutbox',
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
    const { drainEmailOutbox } =
      await import('@/features/payload-cms/payload-cms/utils/email-outbox');
    const { staleBillMailReason } = await import('@/features/billing/services/bill-mail-status');

    const summary = await drainEmailOutbox(
      req.payload,
      environmentVariables.BACKGROUND_EMAIL_HOURLY_LIMIT,
      { staleReason: (email) => staleBillMailReason(req.payload, email) },
    );
    return { output: { ...summary } };
  },
};
