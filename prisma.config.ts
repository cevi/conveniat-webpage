import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  // output is defined in schema.prisma generator block
  datasource: {
    // Use process.env with fallback to allow prisma generate to work in CI without a real DB URL
    url:
      // eslint-disable-next-line n/no-process-env
      process.env['CHAT_DATABASE_URL'] ??
      'postgresql://placeholder:placeholder@localhost:5432/placeholder',
  },
});
