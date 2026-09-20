import type { Payload, PayloadRequest } from 'payload';

export const DEFAULT_QUEUE = 'default';
export const MAIL_QUEUE = 'mail';

async function getActiveWorkerJobIds(payload: Payload): Promise<Set<string>> {
  const twoMinutesAgo = new Date();
  twoMinutesAgo.setMinutes(twoMinutesAgo.getMinutes() - 2);

  const activeWorkersResult = await payload.find({
    collection: 'payload-workers',
    where: {
      lastHeartbeat: { greater_than: twoMinutesAgo.toISOString() },
    },
    limit: 100,
    context: { internal: true },
  });

  return new Set(
    activeWorkersResult.docs
      .flatMap((w) => w.activeJobIds ?? [])
      .map((entry) => entry.jobId)
      .filter((id): id is string => typeof id === 'string' && id.length > 0),
  );
}

/**
 * Cleans up stale incomplete scheduled jobs (e.g. from process crashes or OOM kills)
 * that would otherwise permanently block the scheduler.
 *
 * `countRunnableOrActiveJobsForQueue` already excludes properly errored jobs
 * (those with the `error` field set), but crash-orphaned jobs lack this field
 * and remain counted as active indefinitely.
 *
 * @param request The Payload request object
 * @param taskSlug The slug of the task to clean up
 * @param maxAgeMinutes How long an incomplete job may sit past its start time before it counts as
 *                      stale. Default is 10080 (7 days). Set per-task based on its expected maximum runtime.
 */
export async function cleanupStaleScheduledJobs(
  request: PayloadRequest,
  taskSlug: string,
  maxAgeMinutes: number = 7 * 24 * 60, // 7 days default
): Promise<void> {
  const cutoffDate = new Date();
  cutoffDate.setMinutes(cutoffDate.getMinutes() - maxAgeMinutes);

  const staleJobs = await request.payload.find({
    collection: 'payload-jobs',
    where: {
      and: [
        { taskSlug: { equals: taskSlug } },
        { completedAt: { exists: false } },
        { 'meta.scheduled': { equals: true } },
        { createdAt: { less_than: cutoffDate.toISOString() } },
        // A scheduled job is created as soon as the scheduler decides the occurrence,
        // and then waits for its `waitUntil`. Age alone would therefore declare the
        // next nightly run stale hours before it is due and delete it, so a job that
        // has not reached its start time yet is never stale. Jobs from before the
        // scheduler passed `waitUntil` on carry none and are judged by age as before.
        {
          or: [
            { waitUntil: { exists: false } },
            { waitUntil: { less_than: cutoffDate.toISOString() } },
          ],
        },
      ],
    },
    limit: 100,
  });

  const activeWorkerJobIds = await getActiveWorkerJobIds(request.payload);
  const actuallyStaleJobs = staleJobs.docs.filter((job) => !activeWorkerJobIds.has(job.id));

  if (actuallyStaleJobs.length > 0) {
    request.payload.logger.warn(
      `Cleaning up ${actuallyStaleJobs.length} stale ${taskSlug} job(s) older than ${maxAgeMinutes} minutes`,
    );
    for (const staleJob of actuallyStaleJobs) {
      await request.payload.delete({
        collection: 'payload-jobs',
        id: staleJob.id,
      });
    }
  }
}

/**
 * Cleans up completed scheduled jobs for a specific task slug to keep the database size in check.
 * This is safe to run in beforeSchedule since the job being scheduled hasn't started yet,
 * and the previous job is fully completed.
 *
 * @param request The Payload request object
 * @param taskSlug The slug of the task to clean up
 */
export async function cleanupCompletedScheduledJobs(
  request: PayloadRequest,
  taskSlug: string,
): Promise<void> {
  const completedJobs = await request.payload.find({
    collection: 'payload-jobs',
    where: {
      and: [
        { taskSlug: { equals: taskSlug } },
        { completedAt: { exists: true } },
        { 'meta.scheduled': { equals: true } },
      ],
    },
    limit: 100, // Clean up in batches of 100 to prevent long-running queries
  });

  if (completedJobs.docs.length > 0) {
    for (const completedJob of completedJobs.docs) {
      await request.payload.delete({
        collection: 'payload-jobs',
        id: completedJob.id,
      });
    }
  }
}

/**
 * Recovers stale manually-triggered or on-demand jobs that got stuck with `processing: true`
 * because a worker process crashed, restarted, or was killed.
 *
 * It resets `processing: false` so that the job can either be retried
 * by the runner (if attempts remaining) or marked as completed/failed.
 */
export async function recoverStaleJobs(
  request: PayloadRequest,
  maxAgeMinutes: number = 60, // 1 hour default
): Promise<void> {
  const cutoffDate = new Date();
  cutoffDate.setMinutes(cutoffDate.getMinutes() - maxAgeMinutes);

  const staleJobs = await request.payload.find({
    collection: 'payload-jobs',
    where: {
      and: [
        { processing: { equals: true } },
        { completedAt: { exists: false } },
        { updatedAt: { less_than: cutoffDate.toISOString() } },
      ],
    },
    limit: 100,
  });

  const activeWorkerJobIds = await getActiveWorkerJobIds(request.payload);
  const actuallyStaleJobs = staleJobs.docs.filter((job) => !activeWorkerJobIds.has(job.id));

  if (actuallyStaleJobs.length > 0) {
    request.payload.logger.warn(
      `Found ${actuallyStaleJobs.length} stuck processing job(s) older than ${maxAgeMinutes} minutes. Recovering...`,
    );
    for (const staleJob of actuallyStaleJobs) {
      const taskSlug = staleJob.taskSlug;
      const tasksConfig = request.payload.config.jobs.tasks ?? [];
      const taskConfig = tasksConfig.find((t) => t.slug === taskSlug);
      const maxRetries =
        taskConfig && typeof taskConfig.retries === 'number' ? taskConfig.retries : 3;
      const totalTried = typeof staleJob.totalTried === 'number' ? staleJob.totalTried : 0;
      const hasExceededAttempts = totalTried > maxRetries;

      const updateData: Record<string, unknown> = {
        processing: false,
      };

      if (hasExceededAttempts) {
        updateData['completedAt'] = new Date().toISOString();
        updateData['hasError'] = true;
        updateData['error'] = 'Job aborted: worker process terminated and retry limit exceeded.';
      }

      await request.payload.update({
        collection: 'payload-jobs',
        id: staleJob.id,
        data: updateData,
      });

      request.payload.logger.info(
        `Recovered stuck job ID ${staleJob.id} (task: ${staleJob.taskSlug}). Status: ${
          hasExceededAttempts ? 'Marked Failed' : 'Reset for Retry'
        }`,
      );
    }
  }
}
