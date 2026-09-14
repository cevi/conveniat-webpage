import { BillingTaskSlug } from '@/features/billing/types';
import { DEFAULT_QUEUE } from '@/features/payload-cms/payload-cms/tasks/cleanup-stale-jobs';
import type { PayloadRequest, TaskConfig } from 'payload';

/**
 * Emails every Hof the registrations of theirs that are missing Pflichtangaben.
 *
 * Hourly for the same reason as the weekly report: the weekday and hour belong to the
 * operator in Bill Settings, not to a cron literal in code. The minute is offset from the
 * report's so the two never contend for the same worker slot.
 */
export const sendPflichtangabenRemindersTask: TaskConfig = {
  slug: BillingTaskSlug.SendPflichtangabenReminders,
  retries: 0,
  inputSchema: [],
  schedule: [{ cron: '0 10 * * * *', queue: DEFAULT_QUEUE }],
  handler: async ({
    job,
    req,
  }: {
    job: { id: number | string };
    req: PayloadRequest;
  }): Promise<{ output: Record<string, unknown> }> => {
    const { sendPflichtangabenReminders } =
      await import('@/features/billing/services/pflichtangaben-reminder');
    // The job id, not the worker: both replicas execute this same job, and only the run
    // lock's owner tells those two apart from a genuinely competing run.
    const result = await sendPflichtangabenReminders(req.payload, { runOwner: String(job.id) });
    return { output: { success: true, ...result } };
  },
};
