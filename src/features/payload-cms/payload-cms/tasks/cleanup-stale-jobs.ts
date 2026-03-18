export const DEFAULT_QUEUE = 'default';

import type { PayloadRequest } from 'payload';

/**
 * Cleans up stale incomplete scheduled jobs (e.g. from process crashes or OOM kills)
 * that would otherwise permanently block the scheduler.
 *
 * `countRunnableOrActiveJobsForQueue` already excludes properly errored jobs
 * (those with the `error` field set), but crash-orphaned jobs lack this field
 * and remain counted as active indefinitely.
 */
export async function cleanupStaleScheduledJobs(
  request: PayloadRequest,
  taskSlug: string,
  maxAgeDays: number = 7,
): Promise<void> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);

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
      `Cleaning up ${staleJobs.docs.length} stale ${taskSlug} job(s) older than ${maxAgeDays} days`,
    );
    for (const staleJob of staleJobs.docs) {
      await request.payload.delete({
        collection: 'payload-jobs',
        id: staleJob.id,
      });
    }
  }
}
