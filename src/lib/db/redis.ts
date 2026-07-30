import { environmentVariables as env } from '@/config/environment-variables';
import { FEATURE_FLAG_DEFAULTS } from '@/lib/feature-flags';
import Redis from 'ioredis';
import { revalidateTag, unstable_cache } from 'next/cache';
import { PHASE_PRODUCTION_BUILD } from 'next/constants';

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
                // eslint-disable-next-line unicorn/no-null
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
    console.error('[Redis] Connection Error', error);
  }
});

export const FEATURE_FLAG_PREFIX = 'feature-flag:';

const fetchCachedFeatureFlag = unstable_cache(
  async (key: string): Promise<boolean> => {
    const value = await redis.get(`${FEATURE_FLAG_PREFIX}${key}`);
    if (value === null) return FEATURE_FLAG_DEFAULTS[key] ?? false;
    return value === 'true';
  },
  ['feature-flags-cache'],
  {
    revalidate: 60,
    tags: ['feature-flags'],
  },
);

export const getFeatureFlag = async (key: string): Promise<boolean> => {
  try {
    return await fetchCachedFeatureFlag(key);
  } catch (error) {
    console.warn(
      `[Redis] Feature flag fetch failed for ${key}, returning un-cached default fallback:`,
      (error as Error).message,
    );
    return FEATURE_FLAG_DEFAULTS[key] ?? false;
  }
};

export const setFeatureFlag = async (key: string, value: boolean): Promise<void> => {
  await redis.set(`${FEATURE_FLAG_PREFIX}${key}`, String(value));
  try {
    revalidateTag('feature-flags', 'max-age=0');
  } catch {
    // Ignore when executed outside request context (e.g., seeding scripts)
  }
};
