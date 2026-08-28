import type {
  BillingJobProgress,
  JobProgressPort,
} from '@/features/billing/ports/job-progress.port';
import type { BillingTaskSlug } from '@/features/billing/types';

export interface JobProgressUpdate {
  processedItems: number;
  totalItems: number;
  currentItemName: string;
  runningSummary: Record<string, number>;
}

/**
 * What a long-running billing job reports back while it works. Optional everywhere it is
 * used, so the use cases stay callable from tests and scripts without a progress store.
 */
export interface JobProgressReporter {
  report(update: JobProgressUpdate): Promise<void>;
  /** True once an operator pressed cancel; jobs stop at the next item boundary. */
  shouldCancel(): Promise<boolean>;
}

/**
 * Writes progress for `taskSlug` and answers cancellation checks.
 *
 * A failing progress store must never take a sync down with it — reporting is a
 * convenience for the operator, not part of the job's contract — so writes swallow
 * their errors and a failed cancellation check reads as "keep going".
 */
export const createJobProgressReporter = (
  progressStore: JobProgressPort,
  taskSlug: BillingTaskSlug,
  jobId: string,
): JobProgressReporter => {
  const startedAt = new Date().toISOString();

  return {
    async report(update: JobProgressUpdate): Promise<void> {
      const progress: BillingJobProgress = {
        jobId,
        startedAt,
        updatedAt: new Date().toISOString(),
        ...update,
      };
      try {
        await progressStore.publish(taskSlug, progress);
      } catch {
        // Ignored on purpose: see the doc comment above.
      }
    },

    async shouldCancel(): Promise<boolean> {
      try {
        return await progressStore.isCancelRequested(taskSlug);
      } catch {
        return false;
      }
    },
  };
};
