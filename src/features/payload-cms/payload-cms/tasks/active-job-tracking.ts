import type { JobsConfig, MaybePromise } from 'payload';

type JobTask = NonNullable<JobsConfig['tasks']>[number];
type JobWorkflow = NonNullable<JobsConfig['workflows']>[number];

/**
 * The ids of the jobs this process is running right now, in the order they started.
 *
 * The stale-job cleanup in `cleanup-stale-jobs.ts` deletes or resets jobs that look abandoned,
 * and reads `payload-workers.activeJobId` to spare the one job a live worker is still working
 * on. That field used to be written by a `beforeChange` hook on `payload-jobs`, which only ran
 * because `jobs.runHooks` was on — and `runHooks` is what broke every task log write, see the
 * comment on `jobsConfig` in `payload.config.ts`. A handler knows which job it is running
 * without any hook, so the worker keeps the answer here and publishes it with its heartbeat.
 */
const runningJobIds = new Set<string>();

let announceStart: (() => void) | undefined;

/**
 * Every job this worker is running, oldest first. A cleanup pass can meet any of them, so they
 * all have to be published, not just the one that has been running the longest.
 */
export const getRunningJobIds = (): string[] => [...runningJobIds];

/**
 * Registers what to do when this worker picks up a job. A job whose start time has passed is
 * already old enough to be cleaned up on the tick it starts, so its claim cannot wait for the
 * next heartbeat.
 *
 * @param listener publishes the ids from {@link getRunningJobIds}
 */
export const announceRunningJobsWith = (listener: () => void): void => {
  announceStart = listener;
};

const trackWhileRunning = async <T>(jobId: string, run: () => MaybePromise<T>): Promise<T> => {
  // A task running as a step of a workflow is handed the workflow's job id, so the id is
  // already registered. Only the call that added it removes it again, otherwise the workflow
  // would look idle from its first finished step onwards.
  const isOutermost = !runningJobIds.has(jobId);
  if (isOutermost) {
    runningJobIds.add(jobId);
    announceStart?.();
  }
  try {
    return await run();
  } finally {
    if (isOutermost) {
      runningJobIds.delete(jobId);
    }
  }
};

/**
 * Wraps a task so the worker knows it is running it. Tasks whose handler is a file path are
 * returned unchanged, because that handler runs in a process this one cannot see.
 *
 * @param task the task to track
 */
export const withActiveJobTracking = (task: JobTask): JobTask => {
  const { handler } = task;
  if (typeof handler !== 'function') {
    return task;
  }

  return {
    ...task,
    handler: (arguments_) =>
      trackWhileRunning(String(arguments_.job.id), () => handler(arguments_)),
  };
};

/**
 * Wraps a workflow so the worker knows it is running it, covering the whole run rather than the
 * individual steps. Workflows defined as JSON, or by a file path, are returned unchanged.
 *
 * @param workflow the workflow to track
 */
export const withActiveWorkflowTracking = (workflow: JobWorkflow): JobWorkflow => {
  const { handler } = workflow;
  if (typeof handler !== 'function') {
    return workflow;
  }

  return {
    ...workflow,
    handler: (arguments_) =>
      trackWhileRunning(String(arguments_.job.id), () => handler(arguments_)),
  };
};
