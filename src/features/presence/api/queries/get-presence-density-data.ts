import { trpcBaseProcedure } from '@/trpc/init';

export const getPresenceDensityData = trpcBaseProcedure.query(async ({ ctx }) => {
  const { prisma } = ctx;

  const logs = await prisma.presenceLog.findMany({
    orderBy: {
      timestamp: 'asc',
    },
    select: {
      timestamp: true,
      isPresent: true,
    },
  });

  // Calculate density (running count) over time
  let currentCount = 0;
  const densityData = logs.map((log) => {
    if (log.isPresent) {
      currentCount += 1;
    } else {
      currentCount = Math.max(0, currentCount - 1);
    }
    return {
      timestamp: log.timestamp.toISOString(),
      count: currentCount,
    };
  });

  return densityData;
});
