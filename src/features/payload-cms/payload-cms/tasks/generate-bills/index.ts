import { RedisJobProgressAdapter } from '@/features/billing/adapters/redis-job-progress.adapter';
import { createJobProgressReporter } from '@/features/billing/services/job-progress-reporter';
import { BillingTaskSlug } from '@/features/billing/types';
import type { PayloadRequest, TaskConfig } from 'payload';

export const generateBillsTask: TaskConfig = {
  slug: 'generateBills',
  retries: 0,
  inputSchema: [],
  handler: async ({
    job,
    req,
  }: {
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

    try {
      const result = await generateBills(payload, undefined, undefined, reporter, String(job.id));

      return {
        output: {
          success: true,
          ...result,
        },
      };
    } finally {
      // The final counters live on the job document from here on; leaving the live
      // record behind would make the toolbar show a run that already ended.
      await progressStore.clear(BillingTaskSlug.GenerateBills);
      await progressStore.clearCancel(BillingTaskSlug.GenerateBills);
    }
  },
};
