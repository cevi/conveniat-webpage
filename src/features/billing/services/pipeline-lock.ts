/** What the toolbar knows about the latest run of a pipeline step. */
interface UpstreamJob {
  status: 'pending' | 'failed' | 'success';
  summary?: Record<string, unknown>;
}

/** Why a pipeline step may not start yet, judged by the step before it. */
export type PipelineLock = 'never-run' | 'running' | 'unsuccessful';

/**
 * Whether the step before this one stands in its way, and how.
 *
 * A step only unlocks once the one before it ran to the end. The three ways of not being
 * there yet are told apart because they ask different things of the operator: start the
 * step, wait for it, or run it again. One sentence for all three told someone watching a
 * sync run that there had never been a successful one.
 *
 * Errors the step reported do not lock the next one. Most of them name a single
 * participant, such as a payment Cevi.DB would not take or a registration that still needs
 * fixing, and come back on every run until someone fixes that one record. Waiting for a
 * run without them left bill generation locked for the whole camp because of one person.
 * The step still shows its errors; a run that failed or was cancelled still locks.
 *
 * @param upstream the latest job of the preceding step, `undefined` when it never ran
 * @returns the kind of lock, or `undefined` when the step may start
 */
export const pipelineLockFor = (upstream: UpstreamJob | undefined): PipelineLock | undefined => {
  if (upstream === undefined) return 'never-run';
  if (upstream.status === 'pending') return 'running';

  const ranToTheEnd = upstream.status === 'success' && upstream.summary?.['cancelled'] !== true;

  return ranToTheEnd ? undefined : 'unsuccessful';
};
