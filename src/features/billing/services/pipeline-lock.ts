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
 * A step only unlocks once the one before it finished cleanly. The three ways of not being
 * there yet are told apart because they ask different things of the operator: start the
 * step, wait for it, or look at what went wrong and run it again. One sentence for all
 * three told someone watching a sync run that there had never been a successful one.
 *
 * @param upstream the latest job of the preceding step, `undefined` when it never ran
 * @returns the kind of lock, or `undefined` when the step may start
 */
export const pipelineLockFor = (upstream: UpstreamJob | undefined): PipelineLock | undefined => {
  if (upstream === undefined) return 'never-run';
  if (upstream.status === 'pending') return 'running';

  const errors = upstream.summary?.['errors'];
  const finishedCleanly =
    upstream.status === 'success' &&
    upstream.summary?.['cancelled'] !== true &&
    !(Array.isArray(errors) && errors.length > 0);

  return finishedCleanly ? undefined : 'unsuccessful';
};
