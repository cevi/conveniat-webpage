import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const environmentVariables = createEnv({
  /*
   * Serverside Environment variables, not available on the client.
   * Will throw if you access these variables on the client.
   */
  server: {
    DATABASE_URI: z.string().url(),
    PAYLOAD_SECRET: z.string().min(5),
    APP_HOST_URL: z.string().url(),
    NODE_ENV: z.string().default('development'),
    NEXTAUTH_URL: z.string().url(),
    AUTH_TRUST_HOST: z.string().transform((value) => (value === 'true' ? true : false)),
    NEXTAUTH_SECRET: z.string().min(5),
    JWT_SECRET: z.string().min(5),
    HITOBITO_BASE_URL: z.string().url(),
    HITOBITO_FORWARD_URL: z.string().url(),
    GROUPS_WITH_API_ACCESS: z.string().transform((value) =>
      value
        .split(',')
        .map((s) => Number(s.trim()))
        .filter((n) => !Number.isNaN(n)),
    ),
    CEVI_DB_CLIENT_ID: z.string().min(1),
    CEVI_DB_CLIENT_SECRET: z.string().min(1),
    MINIO_ROOT_USER: z.string().min(5),
    MINIO_ROOT_PASSWORD: z.string().min(5),
    MINIO_ACCESS_KEY_ID: z.string().min(5),
    MINIO_SECRET_ACCESS_KEY: z.string().min(5),
    MINIO_BUCKET_NAME: z.string().min(5),
    MINIO_HOST: z.string().url(),
    ENABLE_NODEMAILER: z.string().transform((value) => (value === 'true' ? true : false)),
    SMTP_HOST: z.string().url().optional(),
    SMTP_PORT: z.coerce.number().optional(),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    VAPID_PRIVATE_KEY: z.string().min(5),
    FEATURE_ENABLE_APP_FEATURE: z.string().transform((value) => (value === 'true' ? true : false)),
    ENABLE_SERVICE_WORKER_LOCALLY: z
      .string()
      .transform((value) => (value === 'true' ? true : false)),
  },
  /*
   * Environment variables available on the client (and server).
   *
   * 💡 You'll get type errors if these are not prefixed with NEXT_PUBLIC_.
   */
  client: {
    NEXT_PUBLIC_APP_HOST_URL: z.string().url(),
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string(),
  },

  experimental__runtimeEnv: {
    NEXT_PUBLIC_APP_HOST_URL: process.env['NEXT_PUBLIC_APP_HOST_URL'],
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env['NEXT_PUBLIC_VAPID_PUBLIC_KEY'],
  },

  /**
   * By default, this library will feed the environment variables directly to
   * the Zod validator.
   *
   * This means that if you have an empty string for a value that is supposed
   * to be a number (e.g. `PORT=` in a ".env" file), Zod will incorrectly flag
   * it as a type mismatch violation. Additionally, if you have an empty string
   * for a value that is supposed to be a string with a default value (e.g.
   * `DOMAIN=` in an ".env" file), the default value will never be applied.
   *
   * In order to solve these issues, we recommend that all new projects
   * explicitly specify this option as true.
   */
  emptyStringAsUndefined: true,
});
