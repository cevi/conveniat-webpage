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

/**
 * Builds the `where` that finds the latest job of a task the toolbar may report on.
 *
 * Payload writes the document for a scheduled run ahead of time, with `waitUntil` set to
 * the next cron slot. Without the `waitUntil` filter the newest `syncParticipants` job
 * would almost always be tonight's, and the toolbar — which derives Pending from "no
 * `completedAt`, no error" — would show a sync that never ends and keep the generate and
 * send steps disabled. A job that is not due yet has not started, so it is not news.
 *
 * @param taskSlug The task whose latest job is wanted
 * @param now The moment to compare `waitUntil` against
 */
export function buildLatestJobWhere(
  taskSlug: string,
  now: Date,
): {
  and: (
    | { taskSlug: { equals: string } }
    | { or: ({ waitUntil: { exists: false } } | { waitUntil: { less_than_equal: string } })[] }
  )[];
} {
  return {
    and: [
      { taskSlug: { equals: taskSlug } },
      {
        or: [
          { waitUntil: { exists: false } },
          { waitUntil: { less_than_equal: now.toISOString() } },
        ],
      },
    ],
  };
}
