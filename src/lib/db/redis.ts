import { environmentVariables as env } from '@/config/environment-variables';
import { FEATURE_FLAG_DEFAULTS } from '@/lib/feature-flags';
import { createLogger } from '@/utils/server-logger';
import Redis from 'ioredis';
import { PHASE_PRODUCTION_BUILD } from 'next/constants';

const logger = createLogger('redis');

const globalForRedis = globalThis as unknown as { redis: Redis | undefined };

const isBuild =
  // eslint-disable-next-line n/no-process-env
  process.env['NEXT_PHASE'] === PHASE_PRODUCTION_BUILD ||
  // eslint-disable-next-line n/no-process-env
  process.env['NEXT_PHASE'] === 'phase-production-build';

export const redis =
  globalForRedis.redis ??
  (isBuild
    ? (new Proxy(
        {},
        {
          get: (_target, property): unknown => {
            if (property === 'get')
              return async (): Promise<string | null> => {
                await Promise.resolve();
                return null;
              };
            if (property === 'set')
              return async (): Promise<void> => {
                await Promise.resolve();
              };
            if (property === 'on') return (): void => {};
            // Return a no-op function for any other method to prevent crashes
            return (): void => {};
          },
        },
      ) as unknown as Redis)
    : new Redis(env.REDIS_URL, {
        connectTimeout: 2000,
        maxRetriesPerRequest: 1,
        retryStrategy: (times: number): number | void | null => Math.min(times * 50, 2000),
      }));

if (env.NODE_ENV !== 'production') globalForRedis.redis = redis;

redis.on('error', (error: { code: string }) => {
  if (error.code !== 'EAI_AGAIN') {
    logger.error('Redis connection error', { error });
  }
});

export const FEATURE_FLAG_PREFIX = 'feature-flag:';

/**
 * Reads a feature flag straight from Redis, falling back to its default when the key is unset or
 * Redis is unreachable.
 *
 * Not wrapped in a Next.js cache: `unstable_cache` lives in each replica's own incremental cache,
 * so a flag set on one replica stayed stale on the other for up to its revalidate time (#2645).
 */
export const getFeatureFlag = async (key: string): Promise<boolean> => {
  try {
    const value = await redis.get(`${FEATURE_FLAG_PREFIX}${key}`);
    if (value === null) return FEATURE_FLAG_DEFAULTS[key] ?? false;
    return value === 'true';
  } catch (error) {
    logger.warn('Feature flag fetch failed, returning the default', {
      error,
      'feature_flag.key': key,
    });
    return FEATURE_FLAG_DEFAULTS[key] ?? false;
  }
};

/**
 * Reads several feature flags in one round trip. A flag that was never set reads its default,
 * like `getFeatureFlag`.
 *
 * While Redis cannot be read, each flag takes the value the caller names for that case instead
 * of its default: a default that widens access would otherwise undo an admin's choice for the
 * length of the outage.
 *
 * @param whenUnreadable - the flags to read, each with its value while Redis is unreachable
 */
export const getFeatureFlags = async <K extends string>(
  whenUnreadable: Record<K, boolean>,
): Promise<Record<K, boolean>> => {
  const keys = Object.keys(whenUnreadable) as K[];
  try {
    // the build-time stand-in for Redis answers every call with undefined
    const values = (await redis.mget(keys.map((key) => `${FEATURE_FLAG_PREFIX}${key}`))) as
      (string | null)[] | undefined;
    return Object.fromEntries(
      keys.map((key, index) => {
        const value = values?.[index] ?? undefined;
        return [
          key,
          value === undefined ? (FEATURE_FLAG_DEFAULTS[key] ?? false) : value === 'true',
        ];
      }),
    ) as Record<K, boolean>;
  } catch (error) {
    logger.warn('Feature flag fetch failed, returning the values for an outage', {
      error,
      'feature_flag.key': keys.join(','),
    });
    return { ...whenUnreadable };
  }
};

/**
 * Stores a feature flag in Redis, where every replica reads it on its next call.
 */
export const setFeatureFlag = async (key: string, value: boolean): Promise<void> => {
  await redis.set(`${FEATURE_FLAG_PREFIX}${key}`, String(value));
};
