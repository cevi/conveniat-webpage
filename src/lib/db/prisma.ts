import { environmentVariables } from '@/config/environment-variables';
import { PrismaClient } from '@/lib/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

import { PHASE_PRODUCTION_BUILD } from 'next/constants';

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const isBuild =
  // eslint-disable-next-line n/no-process-env
  process.env['NEXT_PHASE'] === PHASE_PRODUCTION_BUILD ||
  // eslint-disable-next-line n/no-process-env
  process.env['NEXT_PHASE'] === 'phase-production-build';

let prisma: PrismaClient;

if (isBuild) {
  prisma = new Proxy({} as unknown as PrismaClient, {
    get: (_target, property): (() => Promise<null | undefined>) | undefined => {
      if (property === 'then') return undefined; // Should be undefined for promises
      // Return a function that returns a promise resolving to undefined (simulating null/void)
      return () => Promise.resolve(null);
    },
  });
} else {
  const adapter = new PrismaPg({
    connectionString: environmentVariables.CHAT_DATABASE_URL,
    max: 30,
    // pg waits forever for a free connection by default. 3 s sits between the two
    // transaction limits below: a transaction that cannot start still fails at `maxWait`
    // with Prisma's own error, and a plain query stuck behind a full pool fails with pg's
    // "timeout exceeded when trying to connect" instead of hanging until some transaction
    // runs out. It also bounds opening a new connection, which takes milliseconds here.
    connectionTimeoutMillis: 3000,
  });
  prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
      adapter,
      errorFormat: 'pretty',
      // Prisma's defaults, spelled out because the pool timeout above is chosen against them.
      transactionOptions: { maxWait: 2000, timeout: 5000 },
    });
}
if (environmentVariables.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
export default prisma;
