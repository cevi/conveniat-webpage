import { environmentVariables as env } from '@/config/environment-variables';
import Redis from 'ioredis';

const globalForRedis = globalThis as unknown as { redis: Redis | undefined };

import { FEATURE_FLAG_DEFAULTS } from '@/lib/feature-flags';
import { PHASE_PRODUCTION_BUILD } from 'next/constants';

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
        // eslint-disable-next-line unicorn/no-null
        maxRetriesPerRequest: null,
      }));

if (env.NODE_ENV !== 'production') globalForRedis.redis = redis;

redis.on('error', (error: { code: string }) => {
  if (error.code !== 'EAI_AGAIN') {
    console.error('[Redis] Connection Error', error);
  }
});

export const FEATURE_FLAG_PREFIX = 'feature-flag:';

export const getFeatureFlag = async (key: string): Promise<boolean> => {
  const value = await redis.get(`${FEATURE_FLAG_PREFIX}${key}`);
  if (value === null) return FEATURE_FLAG_DEFAULTS[key] ?? false;
  return value === 'true';
};

export const setFeatureFlag = async (key: string, value: boolean): Promise<void> => {
  await redis.set(`${FEATURE_FLAG_PREFIX}${key}`, String(value));
};
