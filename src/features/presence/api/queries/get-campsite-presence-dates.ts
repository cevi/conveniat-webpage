import { trpcBaseProcedure } from '@/trpc/init';
import config from '@payload-config';
import { getPayload } from 'payload';

export const getCampsitePresenceDates = trpcBaseProcedure.query(async () => {
  const payload = await getPayload({ config });
  const globalData = await payload.findGlobal({
    slug: 'campsite-presence',
  });

  return {
    startDate: globalData.startDate ? String(globalData.startDate) : undefined,
    endDate: globalData.endDate ? String(globalData.endDate) : undefined,
  };
});
