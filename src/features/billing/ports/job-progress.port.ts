import type { BillingTaskSlug } from '@/features/billing/types';

/**
 * Live progress of a running billing job.
 *
 * Payload's job store only records a job as pending or finished, so a long run over 100+
 * events looks identical to a stuck one. This is the side channel the running task writes
 * to while it works, and the admin toolbar polls.
 */
export interface BillingJobProgress {
  jobId: string;
  processedItems: number;
  totalItems: number;
  /** What the job is working on right now — an event name, a participant name. */
  currentItemName: string;
  /** Counters accumulated so far, in the same shape as the job's final summary. */
  runningSummary: Record<string, number>;
  startedAt: string;
  updatedAt: string;
}

export interface JobProgressPort {
  publish(taskSlug: BillingTaskSlug, progress: BillingJobProgress): Promise<void>;
  read(taskSlug: BillingTaskSlug): Promise<BillingJobProgress | undefined>;
  clear(taskSlug: BillingTaskSlug): Promise<void>;
  /** Asks a running job to stop at the next item boundary. */
  requestCancel(taskSlug: BillingTaskSlug): Promise<void>;
  isCancelRequested(taskSlug: BillingTaskSlug): Promise<boolean>;
  clearCancel(taskSlug: BillingTaskSlug): Promise<void>;
}
