import { environmentVariables } from '@/config/environment-variables';
import { PrismaClient } from '@/lib/prisma';
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
  prisma = new Proxy(
    {},
    {
      get: (_target, property): (() => Promise<null | undefined>) | undefined => {
        if (property === 'then') return undefined; // Should be undefined for promises
        // Return a function that returns a promise resolving to undefined (simulating null/void)
        // eslint-disable-next-line unicorn/no-null
        return () => Promise.resolve(null);
      },
    },
  ) as unknown as PrismaClient;
} else {
  const adapter = new PrismaPg({ connectionString: environmentVariables.CHAT_DATABASE_URL });
  prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
      adapter,
      errorFormat: 'pretty',
    });
}
if (environmentVariables.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
export default prisma;
