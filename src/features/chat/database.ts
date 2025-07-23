import { environmentVariables } from '@/config/environment-variables';
import { PrismaClient } from '@/lib/prisma';

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (environmentVariables.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
export default prisma;
