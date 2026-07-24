import { trpcAdminProcedure } from '@/trpc/init';
import config from '@payload-config';
import { getPayload } from 'payload';

export const getPresenceDensityData = trpcAdminProcedure.query(async ({ ctx }) => {
  const { prisma } = ctx;

  const payload = await getPayload({ config });
  const globalData = await payload.findGlobal({
    slug: 'campsite-presence',
  });

  const startDateFilter = globalData.startDate
    ? new Date(globalData.startDate)
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const endDateFilter = globalData.endDate ? new Date(globalData.endDate) : undefined;

  const logs = await prisma.presenceLog.findMany({
    where: {
      timestamp: {
        gte: startDateFilter,
        ...(endDateFilter && { lte: endDateFilter }),
      },
    },
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
