import type { PayloadRequest } from 'payload';

export const DEFAULT_QUEUE = 'default';

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
 * @param maxAgeMinutes The maximum allowed age of an incomplete job in minutes before it is considered stale.
 *                      Default is 10080 (7 days). This should be set per-task based on its expected maximum runtime.
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
      ],
    },
    limit: 100,
  });

  if (staleJobs.docs.length > 0) {
    request.payload.logger.warn(
      `Cleaning up ${staleJobs.docs.length} stale ${taskSlug} job(s) older than ${maxAgeMinutes} minutes`,
    );
    for (const staleJob of staleJobs.docs) {
      await request.payload.delete({
        collection: 'payload-jobs',
        id: staleJob.id,
      });
    }
  }
}
