import { environmentVariables as env } from '@/config/environment-variables';
import { migrations } from '@/features/payload-cms/payload-cms/migrations';
import { runWithMigrationLock } from '@/lib/db/migration-lock';
import { createMongoMigrationLockStore } from '@/lib/db/mongodb-migration-lock-store';
import type { MongooseAdapter } from '@payloadcms/db-mongodb';
import { mongooseAdapter } from '@payloadcms/db-mongodb';
import { randomUUID } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import type { BaseDatabaseAdapter, DatabaseAdapterObj, Migration } from 'payload';

const adapter = mongooseAdapter({
  url: env.DATABASE_URI,
  connectOptions: {
    minPoolSize: 50,
    maxPoolSize: 200,
    serverSelectionTimeoutMS: 15_000,
    connectTimeoutMS: 10_000,
    heartbeatFrequencyMS: 10_000,
    retryWrites: true,
    retryReads: true,
  },
  // where `pnpm payload migrate:create` writes; the running server migrates in `connect` below.
  // No `prodMigrations` here: the adapter would run them without the lock.
  migrationDir: path.resolve(process.cwd(), 'src/features/payload-cms/payload-cms/migrations'),
});

/** Runs the pending migrations under the migration lock, once the adapter is connected. */
const migrateUnderLock = async (database: MongooseAdapter & BaseDatabaseAdapter): Promise<void> => {
  const db = database.connection.db;
  if (db === undefined) throw new Error('Cannot migrate: MongoDB is not connected.');
  const { logger } = database.payload;
  await runWithMigrationLock({
    store: createMongoMigrationLockStore(db),
    holder: `${os.hostname()}:${String(process.pid)}:${randomUUID().slice(0, 8)}`,
    // Payload types a migration's arguments as unknown; the mongoose adapter passes MigrateUpArgs
    migrate: () => database.migrate({ migrations: migrations as unknown as Migration[] }),
    logger: {
      info: (message) => logger.info(message),
      warn: (message) => logger.warn(message),
      error: (message) => logger.error(message),
    },
  });
};

/**
 * Database configuration for PayloadCMS.
 *
 * We use the mongoose adapter to connect to the MongoDB database.
 * Important is the minPoolSize and maxPoolSize to ensure that we avoid
 * high latency and connection pool exhaustion.
 *
 * Data migrations run once per database, right after connecting and before `onInit`, and only in
 * production, where the adapter used to run them itself. Payload records each in
 * `payload-migrations`, so `pnpm payload migrate:status` shows which ran. Production runs several
 * replicas, and two that start together would run the same migration at once, so they take the
 * migration lock first (see `migration-lock.ts`); `pnpm payload migrate` from a shell does not.
 * The lock does not make a migration atomic and the standalone Mongo has no transactions, so a
 * migration must still be safe to run twice. A failing one stops Payload from initializing on
 * that replica.
 */
export const dbConfig: DatabaseAdapterObj = {
  ...adapter,
  init: (args) => {
    const database = adapter.init(args);
    const connect = database.connect;
    if (connect === undefined) return database;
    database.connect = async (options): Promise<void> => {
      await connect.call(database, options);
      if (env.NODE_ENV !== 'production') return;
      await migrateUnderLock(database as MongooseAdapter & BaseDatabaseAdapter);
    };
    return database;
  },
};
