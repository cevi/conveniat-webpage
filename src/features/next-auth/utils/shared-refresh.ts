import { redis } from '@/lib/db/redis';
import { createLogger } from '@/utils/server-logger';
import type { JWT } from 'next-auth/jwt';
import { createHash, randomUUID } from 'node:crypto';

const logger = createLogger('next-auth:shared-refresh');

/**
 * What a refresh came to: the new token, `null` when Cevi.DB refused the refresh token and the
 * session ends, `undefined` when Cevi.DB could not be reached and the session goes on as it is.
 */
export type RefreshOutcome = JWT | null | undefined;

const KEY_PREFIX = 'auth:refresh:';
/** Longer than a refresh takes, with its retries and the profile fetch after it. */
const LOCK_TTL_MS = 15_000;
/** How long a finished refresh answers late requests that still carry the old cookie. */
const OUTCOME_TTL_MS = 60_000;
const POLL_INTERVAL_MS = 100;

const RELEASE_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
end
return 0
`;

interface StoredOutcome {
  token: JWT | null;
}

const readOutcome = async (key: string): Promise<StoredOutcome | undefined> => {
  const raw = await redis.get(key);
  if (raw === null) return undefined;
  return JSON.parse(raw) as StoredOutcome;
};

const sleep = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

/**
 * Runs the refresh of one refresh token once across all replicas.
 *
 * Cevi.DB rotates the refresh token on every refresh and refuses the old one as soon as the new
 * access token has been used, which happens right away for the profile. Two replicas that both
 * see a request with the same expired cookie would otherwise both refresh, and the second one
 * would end the session the first one just renewed. The replica that takes the lock refreshes and
 * leaves what came of it in Redis; the others wait for that and answer with it. A request that
 * arrives shortly after, still with the old cookie, gets the same answer.
 *
 * The refresh token is hashed into the key and never stored. The outcome holds the new tokens, so
 * it lives no longer than a late request needs. Without Redis every replica refreshes on its own,
 * as it did before.
 */
export async function shareRefreshAcrossReplicas(
  refreshToken: string,
  refresh: () => Promise<RefreshOutcome>,
): Promise<RefreshOutcome> {
  const key = `${KEY_PREFIX}${createHash('sha256').update(refreshToken).digest('hex')}`;
  const lockKey = `${key}:lock`;
  const lockValue = randomUUID();

  try {
    const known = await readOutcome(key);
    if (known !== undefined) return known.token;

    const acquired = await redis.set(lockKey, lockValue, 'PX', LOCK_TTL_MS, 'NX');
    if (acquired !== 'OK') {
      logger.debug('Waiting for another replica to refresh the session');
      for (let waited = 0; waited < LOCK_TTL_MS; waited += POLL_INTERVAL_MS) {
        await sleep(POLL_INTERVAL_MS);
        const outcome = await readOutcome(key);
        if (outcome !== undefined) return outcome.token;
        // Released without an outcome: Cevi.DB could not be reached, so the session goes on and
        // the next request tries again.
        if ((await redis.get(lockKey)) === null) return undefined;
      }
      return undefined;
    }
  } catch (error) {
    logger.warn('Redis is unavailable, refreshing the session without the other replicas', {
      error,
    });
    return await refresh();
  }

  const outcome = await refresh();
  try {
    if (outcome !== undefined) {
      const stored: StoredOutcome = { token: outcome };
      await redis.set(key, JSON.stringify(stored), 'PX', OUTCOME_TTL_MS);
    }
    await redis.eval(RELEASE_SCRIPT, 1, lockKey, lockValue);
  } catch (error) {
    logger.warn('Could not share a session refresh with the other replicas', { error });
  }
  return outcome;
}
