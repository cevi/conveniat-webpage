import { environmentVariables } from '@/config/environment-variables';
import Redis from 'ioredis';

const globalForRedis = globalThis as unknown as { redis: Redis | undefined };

export const redis =
  globalForRedis.redis ??
  new Redis(environmentVariables.REDIS_URL, {
    // eslint-disable-next-line unicorn/no-null
    maxRetriesPerRequest: null,
  });

if (environmentVariables.NODE_ENV !== 'production') globalForRedis.redis = redis;

export const FEATURE_FLAG_PREFIX = 'feature-flag:';

export const getFeatureFlag = async (key: string, defaultValue = false): Promise<boolean> => {
  const value = await redis.get(`${FEATURE_FLAG_PREFIX}${key}`);
  if (value === null) return defaultValue;
  return value === 'true';
};

export const setFeatureFlag = async (key: string, value: boolean): Promise<void> => {
  await redis.set(`${FEATURE_FLAG_PREFIX}${key}`, String(value));
};
