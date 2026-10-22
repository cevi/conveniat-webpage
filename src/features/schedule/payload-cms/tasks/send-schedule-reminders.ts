import { environmentVariables } from '@/config/environment-variables';
import {
  cleanupCompletedScheduledJobs,
  cleanupStaleScheduledJobs,
  DEFAULT_QUEUE,
} from '@/features/payload-cms/payload-cms/tasks/cleanup-stale-jobs';
import {
  scheduleUnlessQueued,
  type ScheduleDecision,
} from '@/features/payload-cms/payload-cms/tasks/schedule-decision';
import {
  pruneReminderDeliveries,
  sendScheduleReminders,
} from '@/features/schedule/api/send-schedule-reminders';
import type { TaskConfig } from 'payload';
import { countRunnableOrActiveJobsForQueue } from 'payload';

/**
 * Sends the reminders of blocks and shifts once a minute: some minutes before they start and
 * when they start. A run that is late or missed is caught up by the next one within five
 * minutes, and two runs at once send nothing twice, see `sendScheduleReminders`.
 */
export const sendScheduleRemindersTask: TaskConfig<'sendScheduleReminders'> = {
  slug: 'sendScheduleReminders',
  retries: 0,
  schedule: [
    {
      cron: '* * * * *',
      queue: DEFAULT_QUEUE,
      hooks: {
        beforeSchedule: async ({ queueable, req }): Promise<ScheduleDecision> => {
          await cleanupCompletedScheduledJobs(req, 'sendScheduleReminders');
          // a run reads a few days of the programme and queues its pushes, well under a minute
          await cleanupStaleScheduledJobs(req, 'sendScheduleReminders', 10);

          const runnableOrActiveJobsForQueue = await countRunnableOrActiveJobsForQueue({
            queue: queueable.scheduleConfig.queue,
            req,
            taskSlug: 'sendScheduleReminders',
            onlyScheduled: true,
          });

          return scheduleUnlessQueued(runnableOrActiveJobsForQueue, queueable.waitUntil);
        },
      },
    },
  ],
  inputSchema: [],
  handler: async (): Promise<{ output: Record<string, unknown> }> => {
    // without the app there is no Programm to be reminded of
    if (!environmentVariables.FEATURE_ENABLE_APP_FEATURE) return { output: {} };

    const now = new Date();
    const summary = await sendScheduleReminders(now);
    const pruned = await pruneReminderDeliveries(now);
    return { output: { ...summary, pruned } };
  },
};
