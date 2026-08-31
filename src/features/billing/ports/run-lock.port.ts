import type { BillingTaskSlug } from '@/features/billing/types';

/** A lock held for the duration of one billing run. */
export interface RunLockHandle {
  /** Releases the lock, unless it has already expired and been taken by someone else. */
  release: () => Promise<void>;
}

export type RunLockResult =
  | { acquired: true; lock: RunLockHandle }
  /** Someone else holds it. `heldBy` is the owner they claimed, when it could be read. */
  | { acquired: false; heldBy: string | undefined };

/**
 * Makes sure only one billing run of a given kind is in flight at a time.
 *
 * Generation reserves a block of reference numbers from a counter in the settings, so two
 * runs overlapping hand the same numbers to different participants: the `invoiceNumber`
 * unique index catches half of that, and nothing catches the duplicate QR references,
 * which are what an incoming payment is matched against.
 *
 * The lock records *who* holds it rather than just that it is held, because the two ways
 * of losing the race mean opposite things to an operator. A rival run started by someone
 * else is worth reporting. The same queued job being executed a second time — which
 * happens whenever both replicas pick it up — is not: the work is being done, and saying
 * "a run is already in progress" about a run that is doing exactly what was asked reads
 * as a failure.
 */
export interface RunLockPort {
  /**
   * @param owner identifies the *run*, not the process: every worker executing the same
   * queued job passes the same value, so a duplicate execution is recognisable.
   */
  acquire(taskSlug: BillingTaskSlug, ttlSeconds: number, owner: string): Promise<RunLockResult>;
}

/** What losing the race means. See {@link RunLockPort}. */
export const classifyLockConflict = (
  heldBy: string | undefined,
  owner: string,
): 'duplicate-worker' | 'other-run' =>
  heldBy !== undefined && heldBy === owner ? 'duplicate-worker' : 'other-run';
