import { environmentVariables } from '@/config/environment-variables';
import { PrismaClient } from '@/lib/prisma';
import { PrismaPg } from '@prisma/adapter-pg';

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const adapter = new PrismaPg({ connectionString: environmentVariables.CHAT_DATABASE_URL });

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    errorFormat: 'pretty',
  });
if (environmentVariables.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
export default prisma;
