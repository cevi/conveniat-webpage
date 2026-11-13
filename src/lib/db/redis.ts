import { environmentVariables as env } from '@/config/environment-variables';
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
