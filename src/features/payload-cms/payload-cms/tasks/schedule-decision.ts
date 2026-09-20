/**
 * What a task's `beforeSchedule` hook answers when the scheduler asks whether this
 * occurrence should be queued.
 *
 * `waitUntil` is the field that is easy to forget and expensive to forget. Payload queues
 * the job with exactly the `waitUntil` the hook returns, and a job without one is runnable
 * straight away: it is picked up by the next queue poll, finishes, and the poll after that
 * finds nothing pending and queues the next occurrence. A cron of any shape then
 * degenerates into "as often as the queue polls", which is every ten seconds here. Passing
 * `queueable.waitUntil` through is what keeps `0 3 * * *` meaning three in the morning.
 *
 * Payload's own `defaultBeforeSchedule` does both of these things; a task only replaces it
 * to add its own conditions, not to opt out of them.
 */
export interface ScheduleDecision {
  shouldSchedule: boolean;
  input: Record<string, never>;
  waitUntil?: Date;
}

/**
 * Queue the run at the time the cron asked for.
 *
 * `queueable.waitUntil` is optional in Payload's types even though the scheduler always
 * works one out, so a missing time falls back to the old behaviour of running at once.
 */
export const scheduleAt = (waitUntil: Date | undefined): ScheduleDecision => ({
  shouldSchedule: true,
  input: {},
  ...(waitUntil === undefined ? {} : { waitUntil }),
});

/**
 * Leave this occurrence unqueued. The scheduler re-evaluates on the next poll.
 */
export const skipSchedule = (): ScheduleDecision => ({
  shouldSchedule: false,
  input: {},
});

/**
 * Queue the run unless one is already queued or running.
 *
 * Without this guard every poll adds another copy of the same occurrence, because a job
 * waiting for its `waitUntil` is not "done" and never will be until it runs.
 *
 * @param runnableOrActiveJobs How many scheduled jobs of this task the queue already holds.
 * @param waitUntil The time the cron asked for, taken from `queueable.waitUntil`.
 */
export const scheduleUnlessQueued = (
  runnableOrActiveJobs: number,
  waitUntil: Date | undefined,
): ScheduleDecision => (runnableOrActiveJobs > 0 ? skipSchedule() : scheduleAt(waitUntil));
