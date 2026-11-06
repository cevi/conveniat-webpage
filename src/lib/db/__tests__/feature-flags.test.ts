import { FEATURE_FLAG_PREFIX, getFeatureFlag, setFeatureFlag } from '@/lib/db/redis';
import { FEATURE_FLAG_FORUM_MODERATION, FEATURE_FLAG_SEND_MESSAGES } from '@/lib/feature-flags';

jest.mock('@/config/environment-variables', () => ({
  environmentVariables: { REDIS_URL: 'redis://test', NODE_ENV: 'test' },
}));

/**
 * One Redis shared by every client, like the one both replicas talk to. `failing` makes every
 * command reject, for the outage case.
 */
const sharedRedis = { values: new Map<string, string>(), failing: false };

jest.mock('ioredis', () => {
  class FakeRedis {
    on(): this {
      return this;
    }

    get(key: string): Promise<string | null> {
      if (sharedRedis.failing) return Promise.reject(new Error('connection refused'));
      return Promise.resolve(sharedRedis.values.get(key) ?? null);
    }

    set(key: string, value: string): Promise<'OK'> {
      if (sharedRedis.failing) return Promise.reject(new Error('connection refused'));
      sharedRedis.values.set(key, value);
      return Promise.resolve('OK');
    }
  }
  return { __esModule: true, default: FakeRedis };
});

describe('feature flags', () => {
  beforeEach(() => {
    sharedRedis.values.clear();
    sharedRedis.failing = false;
  });

  it('reads the default while the flag was never set', async () => {
    await expect(getFeatureFlag(FEATURE_FLAG_SEND_MESSAGES)).resolves.toBe(true);
    await expect(getFeatureFlag(FEATURE_FLAG_FORUM_MODERATION)).resolves.toBe(false);
  });

  it('reads a flag the other replica changed on the very next call', async () => {
    await expect(getFeatureFlag(FEATURE_FLAG_SEND_MESSAGES)).resolves.toBe(true);

    // What `setFeatureFlag` on the other replica leaves behind in the shared Redis.
    sharedRedis.values.set(`${FEATURE_FLAG_PREFIX}${FEATURE_FLAG_SEND_MESSAGES}`, 'false');

    await expect(getFeatureFlag(FEATURE_FLAG_SEND_MESSAGES)).resolves.toBe(false);
  });

  it('reads back what it set', async () => {
    await setFeatureFlag(FEATURE_FLAG_FORUM_MODERATION, true);
    await expect(getFeatureFlag(FEATURE_FLAG_FORUM_MODERATION)).resolves.toBe(true);
  });

  it('falls back to the default while Redis is down', async () => {
    sharedRedis.values.set(`${FEATURE_FLAG_PREFIX}${FEATURE_FLAG_SEND_MESSAGES}`, 'false');
    sharedRedis.failing = true;
    await expect(getFeatureFlag(FEATURE_FLAG_SEND_MESSAGES)).resolves.toBe(true);
  });
});
