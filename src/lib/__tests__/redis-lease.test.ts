import { startRedisLease, type RedisLease } from '@/lib/redis-lease';

/**
 * A single Redis key with a TTL, answering the lease script the way Redis does: take it when
 * it is free, extend it for its holder, refuse everyone else.
 */
const store: {
  value: string | undefined;
  expiresAt: number;
  down: boolean;
  hanging: boolean;
} = {
  value: undefined,
  expiresAt: 0,
  down: false,
  hanging: false,
};

jest.mock('@/lib/db/redis', () => ({
  redis: {
    eval: async (
      _script: string,
      _keys: number,
      _key: string,
      holder: string,
      ttlMs: string,
    ): Promise<number> => {
      await Promise.resolve();
      if (store.hanging) await new Promise<never>(() => {});
      if (store.down) throw new Error('connect ECONNREFUSED');
      if (store.value !== undefined && Date.now() >= store.expiresAt) store.value = undefined;
      if (store.value !== undefined && store.value !== holder) return 0;
      store.value = holder;
      store.expiresAt = Date.now() + Number(ttlMs);
      return 1;
    },
  },
}));
jest.mock('@/utils/server-logger', () => ({
  createLogger: (): Record<string, jest.Mock> => ({ info: jest.fn(), warn: jest.fn() }),
}));

const options = { key: 'lease', ttlMs: 30_000, renewEveryMs: 10_000 };

const advance = async (ms: number): Promise<void> => {
  await jest.advanceTimersByTimeAsync(ms);
};

describe('startRedisLease', () => {
  const leases: RedisLease[] = [];
  const start = (holder: string): RedisLease => {
    const lease = startRedisLease({ ...options, holder });
    leases.push(lease);
    return lease;
  };

  beforeEach(() => {
    jest.useFakeTimers();
    store.value = undefined;
    store.expiresAt = 0;
    store.down = false;
    store.hanging = false;
  });

  afterEach(() => {
    for (const lease of leases.splice(0)) lease.stop();
    jest.useRealTimers();
  });

  it('lets one of two processes hold it, for as long as that one keeps renewing', async () => {
    const first = start('a');
    const second = start('b');
    await advance(0);

    expect(first.isHeld()).toBe(true);
    expect(second.isHeld()).toBe(false);

    await advance(120_000);

    expect(first.isHeld()).toBe(true);
    expect(second.isHeld()).toBe(false);
  });

  it('passes to the other process once the holder stops renewing', async () => {
    const first = start('a');
    const second = start('b');
    await advance(0);

    first.stop();
    await advance(options.ttlMs - options.renewEveryMs);
    expect(first.isHeld()).toBe(false);
    expect(second.isHeld()).toBe(false);

    await advance(options.renewEveryMs);
    expect(second.isHeld()).toBe(true);
  });

  it('is never held by both at once while the holder stops renewing', async () => {
    const first = start('a');
    const second = start('b');
    await advance(0);
    first.stop();

    for (let elapsed = 0; elapsed < 60_000; elapsed += 1000) {
      await advance(1000);
      expect(first.isHeld() && second.isHeld()).toBe(false);
    }
  });

  it('lets go on time when the wall clock is set back while a renewal hangs', async () => {
    const lease = start('a');
    await advance(0);
    store.hanging = true;

    jest.setSystemTime(Date.now() - 3_600_000);
    await advance(options.ttlMs - options.renewEveryMs);

    expect(lease.isHeld()).toBe(false);
  });

  it('is held by nobody while Redis cannot be reached, and taken again once it can', async () => {
    const lease = start('a');
    await advance(0);
    expect(lease.isHeld()).toBe(true);

    store.down = true;
    await advance(options.renewEveryMs);
    expect(lease.isHeld()).toBe(false);

    store.down = false;
    await advance(options.renewEveryMs);
    expect(lease.isHeld()).toBe(true);
  });
});
