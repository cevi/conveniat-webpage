import { RedisJobProgressAdapter } from '@/features/billing/adapters/redis-job-progress.adapter';
import { createJobProgressReporter } from '@/features/billing/services/job-progress-reporter';
import { BillingTaskSlug } from '@/features/billing/types';
import type { PayloadRequest, TaskConfig } from 'payload';

export const generateBillsTask: TaskConfig<'generateBills'> = {
  slug: 'generateBills',
  retries: 0,
  // Set by the daily billing run, which wants the bills mailed once they exist. The toolbar
  // queues generation without it, because there an operator decides when to send.
  inputSchema: [{ name: 'sendAfterwards', type: 'checkbox' }],
  handler: async ({
    input,
    job,
    req,
  }: {
    input: { sendAfterwards?: boolean | null };
    job: { id: number | string };
    req: PayloadRequest;
  }): Promise<{ output: Record<string, unknown> }> => {
    const { payload } = req;
    const { generateBills } = await import('@/features/billing/services/bill-generator-service');

    // The progress channel is best-effort decoration around the job, so a cancel flag
    // left over from a previous run is cleared here rather than trusted.
    const progressStore = new RedisJobProgressAdapter();
    await progressStore.clearCancel(BillingTaskSlug.GenerateBills);
    const reporter = createJobProgressReporter(
      progressStore,
      BillingTaskSlug.GenerateBills,
      String(job.id),
    );

    // Clearing the live record is the job of whoever holds the run lock, not of
    // every worker that reaches this handler — see `JobProgressReporter.finish`.
    const result = await generateBills(payload, undefined, undefined, reporter, String(job.id));

    // The same rule as the toolbar's lock on the send step: only a generation that ran to
    // the end hands over. A duplicate execution did nothing, and the worker that did the
    // work queues the send exactly once.
    if (input.sendAfterwards === true && result.duplicate !== true && result.cancelled !== true) {
      const sendJob = await payload.jobs.queue({ task: BillingTaskSlug.SendBills, input: {} });
      payload.logger.info(
        `Bill generation job ${String(job.id)} queued bill sending as job ${String(sendJob.id)}.`,
      );
    }

    return {
      output: {
        success: true,
        ...result,
      },
    };
  },
};
