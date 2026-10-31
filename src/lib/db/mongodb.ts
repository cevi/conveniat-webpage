import { environmentVariables as env } from '@/config/environment-variables';
import { migrations } from '@/features/payload-cms/payload-cms/migrations';
import { mongooseAdapter } from '@payloadcms/db-mongodb';
import path from 'node:path';

/**
 * Database configuration for PayloadCMS.
 *
 * We use the mongoose adapter to connect to the MongoDB database.
 * Important is the minPoolSize and maxPoolSize to ensure that we avoid
 * high latency and connection pool exhaustion.
 *
 * Data migrations run once per database, before `onInit`, and only in production. Payload records
 * each in `payload-migrations`, so `pnpm payload migrate:status` shows which ran. Nothing locks
 * them across replicas and the standalone Mongo has no transactions, so a migration must be safe
 * to run twice. A failing one stops Payload from initializing on that replica.
 */
export const dbConfig = mongooseAdapter({
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
  // where `pnpm payload migrate:create` writes; the running server reads `prodMigrations`
  migrationDir: path.resolve(process.cwd(), 'src/features/payload-cms/payload-cms/migrations'),
  prodMigrations: migrations,
});
