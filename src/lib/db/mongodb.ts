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
    minPoolSize: 5,
    maxPoolSize: 100,
  },
});
