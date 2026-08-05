import { environmentVariables as env } from '@/config/environment-variables';
import { mongooseAdapter } from '@payloadcms/db-mongodb';

/**
 * Database configuration for PayloadCMS.
 *
 * We use the mongoose adapter to connect to the MongoDB database.
 * Important is the minPoolSize and maxPoolSize to ensure that we avoid
 * high latency and connection pool exhaustion.
 *
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
});
