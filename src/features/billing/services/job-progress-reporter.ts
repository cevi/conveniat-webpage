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
  /**
   * Drops the live record once the run ends. Called by the execution holding the run
   * lock and by nobody else — the keys are scoped by task slug, so a worker that never
   * started would otherwise erase the state of the run that did.
   */
  finish(): Promise<void>;
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

    async finish(): Promise<void> {
      try {
        // The final counters live on the job document from here on; leaving the live
        // record behind would make the toolbar show a run that already ended.
        await progressStore.clear(taskSlug);
        await progressStore.clearCancel(taskSlug);
      } catch {
        // Ignored on purpose: see the doc comment above.
      }
    },
  };
};
