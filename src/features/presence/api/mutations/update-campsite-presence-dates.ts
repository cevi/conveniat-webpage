import { trpcBaseProcedure } from '@/trpc/init';
import config from '@payload-config';
import { getPayload } from 'payload';
import { z } from 'zod';

export const updateCampsitePresenceDates = trpcBaseProcedure
  .input(
    z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }),
  )
  .mutation(async ({ input }) => {
    const payload = await getPayload({ config });
    const dbNull = JSON.parse('null') as null;
    await payload.updateGlobal({
      slug: 'campsite-presence',
      data: {
        startDate: input.startDate ?? dbNull,
        endDate: input.endDate ?? dbNull,
      },
    });

    return { success: true };
  });
