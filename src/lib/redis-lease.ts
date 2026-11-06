import { redis } from '@/lib/db/redis';
import { createLogger } from '@/utils/server-logger';

const logger = createLogger('redis-lease');

/**
 * Takes the lease when it is free and extends it when this holder already has it, in one
 * script, so no other holder can take it between the read and the write.
 */
const TAKE_OR_EXTEND_SCRIPT = `
local current = redis.call("get", KEYS[1])
if current == ARGV[1] then
  redis.call("pexpire", KEYS[1], ARGV[2])
  return 1
end
if not current then
  redis.call("set", KEYS[1], ARGV[1], "PX", ARGV[2])
  return 1
end
return 0
`;

export interface RedisLeaseOptions {
  /** The Redis key all contenders share. */
  key: string;
  /** Unique per process, so two processes never mistake each other's lease for their own. */
  holder: string;
  /** How long the lease outlives a holder that stopped renewing it. */
  ttlMs: number;
  /** How often the holder renews; well below `ttlMs`, so one slow renewal does not lose it. */
  renewEveryMs: number;
}

export interface RedisLease {
  /** Whether this process may act as the holder right now. Never waits for Redis. */
  isHeld: () => boolean;
  /** Stops renewing. The lease then runs out on its own. */
  stop: () => void;
}

type LeaseState = 'held' | 'taken' | 'unreachable';

/**
 * A lease in Redis that one process at a time holds, renewed in the background.
 *
 * The holder counts itself as holding it until one renewal interval before the TTL it last
 * set runs out, measured from when it sent that renewal. Redis started counting the TTL no
 * earlier than that, so the holder always gives the lease up before Redis can hand it to
 * anyone else. When Redis cannot be reached, nobody holds it: callers fail closed.
 *
 * Only state changes are logged. The renewal itself fires every few seconds on every replica.
 */
export const startRedisLease = ({
  key,
  holder,
  ttlMs,
  renewEveryMs,
}: RedisLeaseOptions): RedisLease => {
  let heldUntil = 0;
  let state: LeaseState | undefined;
  let renewing = false;

  const changeState = (next: LeaseState, error?: unknown): void => {
    if (state === next) return;
    state = next;
    if (next === 'held') logger.info('Took the lease', { key, holder });
    if (next === 'taken') logger.info('Another process holds the lease', { key, holder });
    if (next === 'unreachable')
      logger.warn('Cannot reach Redis, not holding the lease', { key, holder, error });
  };

  const renew = async (): Promise<void> => {
    if (renewing) return;
    renewing = true;
    const sentAt = Date.now();
    try {
      const result = await redis.eval(TAKE_OR_EXTEND_SCRIPT, 1, key, holder, String(ttlMs));
      if (result === 1) {
        heldUntil = sentAt + ttlMs - renewEveryMs;
        changeState('held');
      } else {
        heldUntil = 0;
        changeState('taken');
      }
    } catch (error: unknown) {
      heldUntil = 0;
      changeState('unreachable', error);
    } finally {
      renewing = false;
    }
  };

  void renew();
  const interval = setInterval(() => void renew(), renewEveryMs);

  return {
    isHeld: (): boolean => Date.now() < heldUntil,
    stop: (): void => clearInterval(interval),
  };
};
