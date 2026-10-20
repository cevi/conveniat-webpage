import { BillingTaskSlug } from '@/features/billing/types';
import {
  cleanupCompletedScheduledJobs,
  DEFAULT_QUEUE,
} from '@/features/payload-cms/payload-cms/tasks/cleanup-stale-jobs';
import {
  scheduleUnlessQueued,
  type ScheduleDecision,
} from '@/features/payload-cms/payload-cms/tasks/schedule-decision';
import type { PayloadRequest, TaskConfig } from 'payload';
import { countRunnableOrActiveJobsForQueue } from 'payload';

/**
 * Generates and mails the day's bills, when Bill Settings switch it on.
 *
 * Hourly for the same reason as the weekly report: the hour belongs to the operator in Bill
 * Settings, not to a cron literal in code. Waking every hour also lets a day whose sync ran
 * late still get its run. The minute is offset from the other billing schedules.
 */
export const runDailyBillingTask: TaskConfig = {
  slug: BillingTaskSlug.RunDailyBilling,
  retries: 0,
  inputSchema: [],
  schedule: [
    {
      cron: '0 20 * * * *',
      queue: DEFAULT_QUEUE,
      hooks: {
        beforeSchedule: async ({ queueable, req }): Promise<ScheduleDecision> => {
          // Most ticks decide that nothing is due, and the result worth keeping is the
          // `generateBills` job a due tick queues, so the hourly documents are not kept.
          await cleanupCompletedScheduledJobs(req, BillingTaskSlug.RunDailyBilling);

          const runnableOrActiveJobs = await countRunnableOrActiveJobsForQueue({
            queue: queueable.scheduleConfig.queue,
            req,
            taskSlug: BillingTaskSlug.RunDailyBilling,
            onlyScheduled: true,
          });
          return scheduleUnlessQueued(runnableOrActiveJobs, queueable.waitUntil);
        },
      },
    },
  ],
  handler: async ({
    job,
    req,
  }: {
    job: { id: number | string };
    req: PayloadRequest;
  }): Promise<{ output: Record<string, unknown> }> => {
    const { runDailyBilling } = await import('@/features/billing/services/daily-billing-run');
    const result = await runDailyBilling(req.payload, { runOwner: String(job.id) });
    return { output: { success: true, ...result } };
  },
};
