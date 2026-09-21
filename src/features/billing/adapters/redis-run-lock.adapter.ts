import type { RunLockPort, RunLockResult } from '@/features/billing/ports/run-lock.port';
import type { BillingTaskSlug } from '@/features/billing/types';
import { redis } from '@/lib/db/redis';
import { randomUUID } from 'node:crypto';

const LOCK_KEY_PREFIX = 'billing:run-lock:';

/**
 * Releases the lock only if this holder still owns it.
 *
 * A plain DEL would let a run that overran its TTL delete the lock a *different* run has
 * since taken, which is the one way a mutex can end up worse than no mutex at all. The
 * whole stored value is compared, so the random token inside it is what makes this safe —
 * the owner alone is not unique enough, since two workers on the same job share it.
 */
const RELEASE_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
end
return 0
`;

interface StoredLock {
  token: string;
  owner: string;
}

const readOwner = (raw: string | null): string | undefined => {
  if (raw === null || raw === '') return undefined;
  try {
    const parsed = JSON.parse(raw) as Partial<StoredLock>;
    return typeof parsed.owner === 'string' ? parsed.owner : undefined;
  } catch {
    // A value written by an older build, before the owner was recorded. Unreadable is
    // treated as "someone else", which is the cautious direction.
    return undefined;
  }
};

/**
 * Redis-backed run lock, shared across replicas.
 *
 * The TTL is the safety valve rather than the mechanism: it is set long enough to cover a
 * full run and is renewed by nobody, so a process that dies takes at most that long to
 * free the queue.
 */
export class RedisRunLockAdapter implements RunLockPort {
  async acquire(
    taskSlug: BillingTaskSlug,
    ttlSeconds: number,
    owner: string,
  ): Promise<RunLockResult> {
    const key = `${LOCK_KEY_PREFIX}${taskSlug}`;
    const value = JSON.stringify({ token: randomUUID(), owner } satisfies StoredLock);
    const acquired = await redis.set(key, value, 'EX', ttlSeconds, 'NX');

    if (acquired === 'OK') {
      return {
        acquired: true,
        lock: {
          release: async (): Promise<void> => {
            await redis.eval(RELEASE_SCRIPT, 1, key, value);
          },
        },
      };
    }

    // Read the holder so the caller can tell a rival run from a second worker that picked
    // up the same job. The holder can expire between the SET and this GET, in which case
    // the conflict is reported without an owner rather than retried — the next attempt
    // will get the lock.
    return { acquired: false, heldBy: readOwner(await redis.get(key)) };
  }
}
