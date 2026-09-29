import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  // one file per domain; Prisma reads every *.prisma file in the folder
  schema: 'prisma/schema',
  // output is defined in the generator block of prisma/schema/schema.prisma
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // Use process.env with fallback to allow prisma generate to work in CI without a real DB URL
    url:
      // eslint-disable-next-line n/no-process-env
      process.env['CHAT_DATABASE_URL'] ??
      // eslint-disable-next-line n/no-process-env
      process.env['POSTGRES_URL'] ??
      // eslint-disable-next-line n/no-process-env
      process.env['DATABASE_URL'] ??
      'postgresql://placeholder:placeholder@localhost:5432/placeholder',
  },
});
