import { trpcBaseProcedure } from '@/trpc/init';
import config from '@payload-config';
import { getPayload } from 'payload';
import { z } from 'zod';

export const updatePresence = trpcBaseProcedure
  .input(
    z.object({
      presentAtCamp: z.boolean(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const { user, prisma } = ctx;

    const updatedUser = await prisma.user.update({
      where: { uuid: user.uuid },
      data: {
        presentAtCamp: input.presentAtCamp,
      },
    });

    await prisma.presenceLog.create({
      data: {
        userUuid: user.uuid,
        isPresent: input.presentAtCamp,
      },
    });

    const payload = await getPayload({ config });
    await payload.create({
      collection: 'presence-logs',
      data: {
        user: user.uuid,
        isPresent: input.presentAtCamp,
        timestamp: new Date().toISOString(),
      },
    });

    return {
      success: true,
      presentAtCamp: updatedUser.presentAtCamp,
    };
  });
