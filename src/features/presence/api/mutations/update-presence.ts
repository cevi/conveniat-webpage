import { trpcBaseProcedure } from '@/trpc/init';
import config from '@payload-config';
import { TRPCError } from '@trpc/server';
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

    const payload = await getPayload({ config });
    const globalData = await payload.findGlobal({
      slug: 'campsite-presence',
    });

    const now = new Date();

    if (globalData.startDate) {
      const startDate = new Date(globalData.startDate);
      if (now < startDate) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Campsite presence tracking has not started yet.',
        });
      }
    }

    if (globalData.endDate) {
      const endDate = new Date(globalData.endDate);
      if (now > endDate) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Campsite presence tracking has ended.',
        });
      }
    }

    const updatedUser = await prisma.user.upsert({
      where: { uuid: user.uuid },
      create: {
        uuid: user.uuid,
        name: user.name,
        presentAtCamp: input.presentAtCamp,
      },
      update: {
        presentAtCamp: input.presentAtCamp,
      },
    });

    await prisma.presenceLog.create({
      data: {
        userUuid: user.uuid,
        isPresent: input.presentAtCamp,
      },
    });

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
