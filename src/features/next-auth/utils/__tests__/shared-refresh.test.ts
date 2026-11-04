// Redis answers `null` for a missing key, and `null` ends a session
import type { RefreshOutcome } from '@/features/next-auth/utils/shared-refresh';
import type { JWT } from 'next-auth/jwt';

jest.mock('@/utils/server-logger', () => ({
  createLogger: (): Record<string, jest.Mock> => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

/** The part of Redis the refresh uses, shared by every replica of a test. */
const store = new Map<string, { value: string; expiresAt: number }>();
let isRedisDown = false;
const live = (key: string): string | null => {
  const entry = store.get(key);
  if (entry === undefined || entry.expiresAt <= Date.now()) return null;
  return entry.value;
};
const fakeRedis = {
  get: (key: string): Promise<string | null> =>
    isRedisDown ? Promise.reject(new Error('ECONNREFUSED')) : Promise.resolve(live(key)),
  set: (key: string, value: string, _px: 'PX', ttl: number, nx?: 'NX'): Promise<'OK' | null> => {
    if (nx === 'NX' && live(key) !== null) return Promise.resolve(null);
    store.set(key, { value, expiresAt: Date.now() + ttl });
    return Promise.resolve('OK');
  },
  eval: (_script: string, _keys: number, key: string, value: string): Promise<number> => {
    if (live(key) !== value) return Promise.resolve(0);
    store.delete(key);
    return Promise.resolve(1);
  },
};
jest.mock('@/lib/db/redis', () => ({ redis: fakeRedis }));

type Share = (token: string, refresh: () => Promise<RefreshOutcome>) => Promise<RefreshOutcome>;

/** A replica of its own: a fresh copy of the module, with only Redis in common. */
const replica = async (): Promise<Share> => {
  let share: Share | undefined;
  await jest.isolateModulesAsync(async () => {
    const module_ = await import('@/features/next-auth/utils/shared-refresh');
    share = module_.shareRefreshAcrossReplicas;
  });
  if (share === undefined) throw new Error('module did not load');
  return share;
};

const rotated: JWT = { access_token: 'new-access', refresh_token: 'new-refresh' };

/**
 * A refresh that takes a while, as one against Cevi.DB with the profile fetch does. Without an
 * outcome it is one that could not reach Cevi.DB.
 */
const slowRefresh = (outcome?: RefreshOutcome): jest.Mock<Promise<RefreshOutcome>> =>
  jest.fn(() => new Promise((resolve) => setTimeout(() => resolve(outcome), 300)));

describe('a session refreshed on two replicas at once', () => {
  beforeEach(() => {
    store.clear();
    isRedisDown = false;
  });

  it('asks Cevi.DB once, and both replicas answer with the new token', async () => {
    const first = slowRefresh(rotated);
    const second = slowRefresh(rotated);

    const [one, two] = [await replica(), await replica()];
    const outcomes = await Promise.all([
      one('expired-refresh', first),
      two('expired-refresh', second),
    ]);

    expect(first.mock.calls.length + second.mock.calls.length).toBe(1);
    expect(outcomes).toEqual([rotated, rotated]);
  });

  it('answers a request that arrives just after with the same token', async () => {
    await (
      await replica()
    )('expired-refresh', slowRefresh(rotated));
    const late = slowRefresh();

    await expect((await replica())('expired-refresh', late)).resolves.toEqual(rotated);
    expect(late).not.toHaveBeenCalled();
  });

  it('ends the session on both when Cevi.DB refused the refresh token', async () => {
    const refused = slowRefresh(null);

    const [one, two] = [await replica(), await replica()];
    const outcomes = await Promise.all([
      one('revoked-refresh', refused),
      two('revoked-refresh', refused),
    ]);

    expect(refused).toHaveBeenCalledTimes(1);
    expect(outcomes).toEqual([null, null]);
  });

  it('keeps the session on both when Cevi.DB could not be reached, and tries again later', async () => {
    const unreachable = slowRefresh();

    const [one, two] = [await replica(), await replica()];
    const outcomes = await Promise.all([
      one('unreachable', unreachable),
      two('unreachable', unreachable),
    ]);
    const retry = slowRefresh(rotated);

    expect(outcomes).toStrictEqual([undefined, undefined]);
    await expect((await replica())('unreachable', retry)).resolves.toEqual(rotated);
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('still refreshes when Redis is down', async () => {
    isRedisDown = true;
    const refresh = slowRefresh(rotated);

    await expect((await replica())('expired-refresh', refresh)).resolves.toEqual(rotated);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('keeps sessions of different refresh tokens apart', async () => {
    const mine = slowRefresh(rotated);
    const other: JWT = { access_token: 'other-access', refresh_token: 'other-refresh' };

    const [one, two] = [await replica(), await replica()];
    const outcomes = await Promise.all([
      one('my-refresh', mine),
      two('other-refresh', slowRefresh(other)),
    ]);

    expect(outcomes).toEqual([rotated, other]);
  });
});
