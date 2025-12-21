import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  // output is defined in schema.prisma generator block
  datasource: {
    url: env('CHAT_DATABASE_URL'),
  },
});
