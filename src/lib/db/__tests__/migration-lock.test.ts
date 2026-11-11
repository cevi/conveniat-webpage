import type {
  MigrationLockLogger,
  MigrationLockStore,
  MigrationLockTimings,
} from '@/lib/db/migration-lock';
import { runWithMigrationLock } from '@/lib/db/migration-lock';

/** The lock document as Mongo keeps it, with the same all-or-nothing operations. */
const createMemoryStore = (initial?: {
  holder: string;
  expiresAt: Date;
}): MigrationLockStore & { current: () => { holder: string; expiresAt: Date } | undefined } => {
  let lock = initial;
  return {
    current: () => lock,
    insert: async (holder, expiresAt): Promise<boolean> => {
      await Promise.resolve();
      if (lock !== undefined) return false;
      lock = { holder, expiresAt };
      return true;
    },
    takeOverExpired: async (holder, now, expiresAt): Promise<boolean> => {
      await Promise.resolve();
      if (lock === undefined || lock.expiresAt > now) return false;
      lock = { holder, expiresAt };
      return true;
    },
    renew: async (holder, expiresAt): Promise<boolean> => {
      await Promise.resolve();
      if (lock?.holder !== holder) return false;
      lock = { holder, expiresAt };
      return true;
    },
    release: async (holder): Promise<void> => {
      await Promise.resolve();
      if (lock?.holder === holder) lock = undefined;
    },
  };
};

const timings: MigrationLockTimings = { leaseMs: 60, renewMs: 15, pollMs: 5, maxWaitMs: 2000 };

/**
 * Runs `work` to the end on the fake clock. Every lease, renewal and poll is a timer, so the
 * order they fire in is fixed. On real timers a runner that stalls for longer than a lease minus
 * a renewal lets a waiting replica take over mid-migration, and the test fails for the runner,
 * not for the lock.
 */
const settle = async <T>(work: Promise<T>): Promise<T> => {
  const [result] = await Promise.all([work, jest.runAllTimersAsync()]);
  return result;
};

const createLogger = (): MigrationLockLogger & { lines: string[] } => {
  const lines: string[] = [];
  return {
    lines,
    info: (message) => lines.push(`info ${message}`),
    warn: (message) => lines.push(`warn ${message}`),
    error: (message) => lines.push(`error ${message}`),
  };
};

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * Pending migrations recorded like `payload-migrations`: a run applies the ones not recorded
 * yet. It counts how often each was applied and how many runs overlapped.
 */
const createMigrations = (
  names: string[],
  durationMs: number,
): {
  migrate: () => Promise<void>;
  applied: Map<string, number>;
  maxConcurrentRuns: () => number;
} => {
  const recorded = new Set<string>();
  const applied = new Map<string, number>();
  let running = 0;
  let maxRunning = 0;
  return {
    applied,
    maxConcurrentRuns: () => maxRunning,
    migrate: async (): Promise<void> => {
      running += 1;
      maxRunning = Math.max(maxRunning, running);
      try {
        for (const name of names) {
          if (recorded.has(name)) continue;
          await sleep(durationMs);
          applied.set(name, (applied.get(name) ?? 0) + 1);
          recorded.add(name);
        }
      } finally {
        running -= 1;
      }
    },
  };
};

describe('runWithMigrationLock', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('lets replicas that start together migrate one after the other, each migration once', async () => {
    const store = createMemoryStore();
    const migrations = createMigrations(['a', 'b'], 20);
    const logger = createLogger();

    await settle(
      Promise.all(
        ['replica-1', 'replica-2', 'replica-3'].map((holder) =>
          runWithMigrationLock({ store, holder, migrate: migrations.migrate, logger, timings }),
        ),
      ),
    );

    expect(migrations.maxConcurrentRuns()).toBe(1);
    expect(Object.fromEntries(migrations.applied)).toEqual({ a: 1, b: 1 });
    expect(store.current()).toBeUndefined();
    expect(logger.lines.filter((line) => line.startsWith('info Waiting'))).toHaveLength(2);
  });

  it('keeps the lock through a migration that outlasts one lease', async () => {
    const store = createMemoryStore();
    // three leases long, so a holder that did not renew would be taken over halfway
    const migrations = createMigrations(['slow'], timings.leaseMs * 3);
    const logger = createLogger();

    await settle(
      Promise.all([
        runWithMigrationLock({
          store,
          holder: 'first',
          migrate: migrations.migrate,
          logger,
          timings,
        }),
        sleep(timings.pollMs).then(() =>
          runWithMigrationLock({
            store,
            holder: 'second',
            migrate: migrations.migrate,
            logger,
            timings,
          }),
        ),
      ]),
    );

    expect(migrations.maxConcurrentRuns()).toBe(1);
    expect(migrations.applied.get('slow')).toBe(1);
    expect(logger.lines.some((line) => line.startsWith('warn'))).toBe(false);
  });

  it('takes over the lock of a holder that crashed once its lease ran out', async () => {
    const store = createMemoryStore({ holder: 'crashed', expiresAt: new Date(Date.now() - 1) });
    const migrations = createMigrations(['a'], 1);
    const logger = createLogger();

    await settle(
      runWithMigrationLock({
        store,
        holder: 'next',
        migrate: migrations.migrate,
        logger,
        timings,
      }),
    );

    expect(migrations.applied.get('a')).toBe(1);
    expect(logger.lines).toEqual([
      'warn Took over the migration lock from a holder whose lease ran out (next).',
      'info Released the migration lock (next).',
    ]);
    expect(store.current()).toBeUndefined();
  });

  it('gives up without migrating when the lock stays held', async () => {
    const store = createMemoryStore({
      holder: 'stuck',
      expiresAt: new Date(Date.now() + 60_000),
    });
    const migrate = jest.fn(async () => {});

    await expect(
      settle(
        runWithMigrationLock({
          store,
          holder: 'waiting',
          migrate,
          logger: createLogger(),
          timings: { ...timings, maxWaitMs: 30 },
        }),
      ),
    ).rejects.toThrow('Gave up waiting for the migration lock');
    expect(migrate).not.toHaveBeenCalled();
    expect(store.current()?.holder).toBe('stuck');
  });

  it('releases the lock when a migration fails, so the next replica retries it at once', async () => {
    const store = createMemoryStore();
    let attempts = 0;
    const migrate = async (): Promise<void> => {
      attempts += 1;
      await Promise.resolve();
      if (attempts === 1) throw new Error('migration failed');
    };

    await expect(
      settle(
        runWithMigrationLock({ store, holder: 'first', migrate, logger: createLogger(), timings }),
      ),
    ).rejects.toThrow('migration failed');
    expect(store.current()).toBeUndefined();

    const logger = createLogger();
    await settle(runWithMigrationLock({ store, holder: 'second', migrate, logger, timings }));
    expect(attempts).toBe(2);
    expect(logger.lines[0]).toBe('info Took the migration lock (second).');
  });

  it('reports a lease lost to another holder while migrating', async () => {
    const store = createMemoryStore();
    const logger = createLogger();
    const migrate = async (): Promise<void> => {
      // another replica took the lock, e.g. after this one stalled past its lease
      await store.release('holder');
      await store.insert('intruder', new Date(Date.now() + 60_000));
      await sleep(timings.renewMs * 3);
    };

    await settle(runWithMigrationLock({ store, holder: 'holder', migrate, logger, timings }));

    expect(
      logger.lines.filter(
        (line) => line === 'error Lost the migration lock while migrating (holder).',
      ),
    ).toHaveLength(1);
    // the release does not take the lock from its new holder
    expect(store.current()?.holder).toBe('intruder');
  });
});
