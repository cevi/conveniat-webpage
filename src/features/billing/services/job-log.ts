/**
 * Reading a billing job's log back into something worth showing an operator.
 *
 * Kept free of Payload and environment imports so it can be tested on its own — the
 * admin API module reads the validated environment at import time.
 */

/**
 * Picks the log entry that describes what a job actually did.
 *
 * Both replicas poll the queue, so one queued job can be executed twice: the worker that
 * loses the run lock returns immediately with empty counters and `duplicate: true`. That
 * entry is usually written *first*, precisely because it does no work — so taking the
 * first match reported "0 generated" for a run that had generated the lot. Real entries
 * win; a duplicate is used only when it is all there is.
 */
export function selectTaskLogOutput(
  logs: { taskSlug?: string | null; output?: unknown }[],
  taskSlug: string,
): Record<string, unknown> | undefined {
  const outputs = logs
    .filter((entry) => entry.taskSlug === taskSlug)
    .map((entry) => entry.output as Record<string, unknown> | undefined);
  const real = outputs.filter((output) => output !== undefined && output['duplicate'] !== true);
  return real.at(-1) ?? outputs.at(-1);
}
