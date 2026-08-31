import type { RunLock, RunLockPort } from '@/features/billing/ports/run-lock.port';
import type { BillingTaskSlug } from '@/features/billing/types';
import { redis } from '@/lib/db/redis';
import { randomUUID } from 'node:crypto';

const LOCK_KEY_PREFIX = 'billing:run-lock:';

/**
 * Releases the lock only if this holder still owns it.
 *
 * A plain DEL would let a run that overran its TTL delete the lock a *different* run has
 * since taken, which is the one way a mutex can end up worse than no mutex at all.
 */
const RELEASE_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
end
return 0
`;

/**
 * Redis-backed run lock, shared across replicas.
 *
 * The TTL is the safety valve rather than the mechanism: it is set long enough to cover a
 * full run and is renewed by nobody, so a process that dies takes at most that long to
 * free the queue.
 */
export class RedisRunLockAdapter implements RunLockPort {
  async acquire(taskSlug: BillingTaskSlug, ttlSeconds: number): Promise<RunLock | undefined> {
    const key = `${LOCK_KEY_PREFIX}${taskSlug}`;
    const token = randomUUID();
    const acquired = await redis.set(key, token, 'EX', ttlSeconds, 'NX');
    if (acquired !== 'OK') return undefined;

    return {
      release: async (): Promise<void> => {
        await redis.eval(RELEASE_SCRIPT, 1, key, token);
      },
    };
  }
}
