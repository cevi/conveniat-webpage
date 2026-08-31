import type { BillingTaskSlug } from '@/features/billing/types';

/** A lock held for the duration of one billing run. */
export interface RunLock {
  /** Releases the lock, unless it has already expired and been taken by someone else. */
  release: () => Promise<void>;
}

/**
 * Makes sure only one billing run of a given kind is in flight at a time.
 *
 * Generation reserves a block of reference numbers from a counter in the settings, so two
 * runs overlapping hand the same numbers to different participants: the `invoiceNumber`
 * unique index catches half of that, and nothing catches the duplicate QR references,
 * which are what an incoming payment is matched against. The admin toolbar disables its
 * buttons while a run is in flight, but that state lives in one browser — a second tab, a
 * second operator, or the per-row "Neu generieren" action all sail straight past it.
 */
export interface RunLockPort {
  /**
   * Takes the lock for `taskSlug`, or resolves to undefined when someone else holds it.
   *
   * The lock carries a TTL so a process that dies mid-run cannot wedge the queue forever.
   */
  acquire(taskSlug: BillingTaskSlug, ttlSeconds: number): Promise<RunLock | undefined>;
}
