/** Where the lock is kept, one record that names its holder and when its lease runs out. */
export interface MigrationLockStore {
  /** Takes the lock if nobody holds it. Resolves `false` when another holder has it. */
  insert: (holder: string, expiresAt: Date) => Promise<boolean>;
  /** Takes the lock over if its lease ran out before `now`. */
  takeOverExpired: (holder: string, now: Date, expiresAt: Date) => Promise<boolean>;
  /** Extends the lease. Resolves `false` when the lock is no longer the holder's. */
  renew: (holder: string, expiresAt: Date) => Promise<boolean>;
  /** Gives the lock up, if it is still the holder's. */
  release: (holder: string) => Promise<void>;
}

export interface MigrationLockLogger {
  info: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
}

export interface MigrationLockTimings {
  /** how long a lease lasts without being renewed */
  leaseMs: number;
  /** how often the holder renews its lease, well within `leaseMs` */
  renewMs: number;
  /** how often a waiting replica checks the lock again */
  pollMs: number;
  /** how long a replica waits for the lock before it gives up and fails to start */
  maxWaitMs: number;
}

/**
 * A lease of a minute, renewed every 15 seconds, survives a slow Mongo round trip and a clock
 * that is a few seconds off between nodes, and frees the lock of a crashed holder within a
 * minute. A replica waits up to 15 minutes, longer than any migration so far has taken.
 */
export const DEFAULT_MIGRATION_LOCK_TIMINGS: MigrationLockTimings = {
  leaseMs: 60_000,
  renewMs: 15_000,
  pollMs: 2000,
  maxWaitMs: 15 * 60_000,
};

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const acquire = async (
  store: MigrationLockStore,
  holder: string,
  logger: MigrationLockLogger,
  timings: MigrationLockTimings,
): Promise<void> => {
  const giveUpAt = Date.now() + timings.maxWaitMs;
  let waiting = false;
  for (;;) {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + timings.leaseMs);
    if (await store.insert(holder, expiresAt)) {
      logger.info(
        waiting
          ? `Took the migration lock after waiting (${holder}).`
          : `Took the migration lock (${holder}).`,
      );
      return;
    }
    if (await store.takeOverExpired(holder, now, expiresAt)) {
      logger.warn(`Took over the migration lock from a holder whose lease ran out (${holder}).`);
      return;
    }
    if (Date.now() >= giveUpAt) {
      throw new Error(
        `Gave up waiting for the migration lock after ${String(timings.maxWaitMs)} ms (${holder}).`,
      );
    }
    if (!waiting) {
      logger.info(`Waiting for another replica to finish its migrations (${holder}).`);
      waiting = true;
    }
    await sleep(timings.pollMs);
  }
};

/**
 * Runs `migrate` while holding the migration lock, so two replicas that start together never
 * run a migration at the same time. One takes the lock; the other waits until it is released,
 * then runs `migrate` too, which finds every migration recorded and does nothing, or retries
 * the one that failed. The holder renews its lease while it works, and a holder that crashed
 * loses the lock once its lease runs out.
 *
 * The lock does not make a migration atomic: a replica that crashes halfway leaves it half
 * done for the next one, so a migration must still be safe to run twice.
 *
 * @param store - where the lock is kept
 * @param holder - names this replica in the lock and in the logs
 * @param migrate - runs the pending migrations
 * @param logger - receives one line per step
 * @param timings - the lease and wait times, see {@link DEFAULT_MIGRATION_LOCK_TIMINGS}
 */
export const runWithMigrationLock = async ({
  store,
  holder,
  migrate,
  logger,
  timings = DEFAULT_MIGRATION_LOCK_TIMINGS,
}: {
  store: MigrationLockStore;
  holder: string;
  migrate: () => Promise<void>;
  logger: MigrationLockLogger;
  timings?: MigrationLockTimings;
}): Promise<void> => {
  await acquire(store, holder, logger, timings);

  let lost = false;
  const renewal = setInterval(() => {
    store
      .renew(holder, new Date(Date.now() + timings.leaseMs))
      .then((renewed) => {
        if (renewed || lost) return;
        lost = true;
        // nothing can stop a migration halfway; say so loudly, since another replica may now
        // be running the same one
        logger.error(`Lost the migration lock while migrating (${holder}).`);
      })
      .catch((error: unknown) => {
        logger.warn(`Could not renew the migration lock (${holder}): ${String(error)}`);
      });
  }, timings.renewMs);
  renewal.unref();

  try {
    await migrate();
  } finally {
    clearInterval(renewal);
    try {
      await store.release(holder);
      logger.info(`Released the migration lock (${holder}).`);
    } catch (error: unknown) {
      // the lease runs out on its own, so this only delays the next replica by a minute
      logger.warn(`Could not release the migration lock (${holder}): ${String(error)}`);
    }
  }
};
