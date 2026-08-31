import { DEFAULT_QUEUE } from '@/features/payload-cms/payload-cms/tasks/cleanup-stale-jobs';
import type { PayloadRequest, TaskConfig } from 'payload';

/**
 * Emails the weekly registration report.
 *
 * Queued every hour rather than weekly: Payload's schedule is a cron literal in code, so
 * a weekly cron here would pin the weekday and hour that an operator is supposed to be
 * able to change in Bill Settings. The task therefore wakes hourly and
 * `isReportDue` decides whether this is the configured slot — which also means a change
 * in the settings takes effect the same week rather than after a deploy.
 */
export const sendWeeklyReportTask: TaskConfig = {
  slug: 'sendWeeklyReport',
  retries: 0,
  inputSchema: [],
  schedule: [{ cron: '0 5 * * * *', queue: DEFAULT_QUEUE }],
  handler: async ({
    req,
  }: {
    req: PayloadRequest;
  }): Promise<{ output: Record<string, unknown> }> => {
    const { sendWeeklyReport } = await import('@/features/billing/services/send-weekly-report');
    const result = await sendWeeklyReport(req.payload);
    return { output: { success: true, ...result } };
  },
};
