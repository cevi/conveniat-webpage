import type {
  BillingJobProgress,
  JobProgressPort,
} from '@/features/billing/ports/job-progress.port';
import type { BillingTaskSlug } from '@/features/billing/types';
import { redis } from '@/lib/db/redis';

const PROGRESS_KEY_PREFIX = 'billing:job-progress:';
const CANCEL_KEY_PREFIX = 'billing:job-cancel:';

/**
 * Progress outlives the longest plausible run but never a deployment's lifetime, so a
 * crashed job cannot leave the toolbar showing a phantom run forever.
 */
const TTL_SECONDS = 60 * 60;

/**
 * Redis-backed progress channel.
 *
 * Deliberately not the database: this is written once per processed item and read by a
 * 2 second poll, and it is worthless the moment the job ends. Redis is also shared
 * across replicas, so the poll does not have to reach the process running the job.
 */
export class RedisJobProgressAdapter implements JobProgressPort {
  async publish(taskSlug: BillingTaskSlug, progress: BillingJobProgress): Promise<void> {
    await redis.set(
      `${PROGRESS_KEY_PREFIX}${taskSlug}`,
      JSON.stringify(progress),
      'EX',
      TTL_SECONDS,
    );
  }

  async read(taskSlug: BillingTaskSlug): Promise<BillingJobProgress | undefined> {
    const raw = await redis.get(`${PROGRESS_KEY_PREFIX}${taskSlug}`);
    if (raw === null || raw.length === 0) return undefined;
    try {
      return JSON.parse(raw) as BillingJobProgress;
    } catch {
      // A malformed record is not worth failing the status endpoint over.
      return undefined;
    }
  }

  async clear(taskSlug: BillingTaskSlug): Promise<void> {
    await redis.del(`${PROGRESS_KEY_PREFIX}${taskSlug}`);
  }

  async requestCancel(taskSlug: BillingTaskSlug): Promise<void> {
    await redis.set(`${CANCEL_KEY_PREFIX}${taskSlug}`, '1', 'EX', TTL_SECONDS);
  }

  async isCancelRequested(taskSlug: BillingTaskSlug): Promise<boolean> {
    const raw = await redis.get(`${CANCEL_KEY_PREFIX}${taskSlug}`);
    return raw !== null && raw.length > 0;
  }

  async clearCancel(taskSlug: BillingTaskSlug): Promise<void> {
    await redis.del(`${CANCEL_KEY_PREFIX}${taskSlug}`);
  }
}
