import { getJobQueueRuns } from '@/features/payload-cms/payload-cms/tasks/job-queues';
import { startRedisLease } from '@/lib/redis-lease';
import { createLogger } from '@/utils/server-logger';
import { randomUUID } from 'node:crypto';
import os from 'node:os';
import type { Payload } from 'payload';

const logger = createLogger('job-runner');

const TICK_MS = 10_000;
const LEASE_KEY = 'payload-jobs:runner-lease';
const LEASE_TTL_MS = 30_000;

/**
 * Schedules and runs the job queues on whichever replica holds the runner lease.
 *
 * This replaces Payload's `autoRun`, which ticks on every replica at once. On Mongo, Payload
 * claims jobs by finding their ids and then setting `processing` on those ids without checking
 * it again, so two replicas polling in the same second both claim and run the same jobs. The
 * scheduler has the same gap: it counts the waiting jobs of a task and queues one when there
 * are none, and two replicas both count none. Running both on one replica at a time closes
 * both. The other replica takes over within the lease TTL once the holder stops renewing.
 *
 * Without Redis nobody holds the lease and no jobs run, rather than both replicas running them.
 *
 * Each queue ticks on its own and skips a tick while its previous one is still running, so a
 * long mail run does not hold up the default queue, and a run never overlaps itself.
 *
 * @returns a function that stops the ticks and the lease renewal
 */
export const startJobRunner = (payload: Payload): (() => void) => {
  const queueRuns = getJobQueueRuns();
  if (queueRuns.length === 0) return (): void => {};

  const lease = startRedisLease({
    key: LEASE_KEY,
    holder: `${os.hostname()}/${randomUUID()}`,
    ttlMs: LEASE_TTL_MS,
    renewEveryMs: TICK_MS,
  });

  const intervals = queueRuns.map(({ queue, limit, silent }) => {
    let running = false;

    const tick = async (): Promise<void> => {
      if (running || !lease.isHeld()) return;
      running = true;
      try {
        if (payload.config.jobs.scheduling === true) {
          await payload.jobs.handleSchedules({ queue });
        }
        await payload.jobs.run({ queue, limit, silent });
      } catch (error: unknown) {
        logger.error('Job queue tick failed', { queue, error });
      } finally {
        running = false;
      }
    };

    return setInterval(() => void tick(), TICK_MS);
  });

  return (): void => {
    for (const interval of intervals) clearInterval(interval);
    lease.stop();
  };
};
