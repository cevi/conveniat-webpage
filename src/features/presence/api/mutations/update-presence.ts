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

    const existingUser = await prisma.user.findUnique({
      where: { uuid: user.uuid },
      select: { presentAtCamp: true },
    });

    const previousPresentAtCamp = existingUser?.presentAtCamp ?? false;

    // Prevent duplicate logs and density count corruption when value is unchanged
    if (existingUser ? previousPresentAtCamp === input.presentAtCamp : !input.presentAtCamp) {
      return {
        success: true,
        presentAtCamp: previousPresentAtCamp,
      };
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

    const prismaLog = await prisma.presenceLog.create({
      data: {
        userUuid: user.uuid,
        isPresent: input.presentAtCamp,
      },
    });

    let payloadLogId: string | number | undefined;

    try {
      const payloadLog = await payload.create({
        collection: 'presence-logs',
        data: {
          user: user.uuid,
          isPresent: input.presentAtCamp,
          timestamp: new Date().toISOString(),
        },
      });
      payloadLogId = payloadLog.id;

      await payload.update({
        collection: 'users',
        id: user.uuid,
        data: {
          presentAtCamp: input.presentAtCamp,
        },
      });
    } catch (payloadError: unknown) {
      if (payloadLogId !== undefined) {
        try {
          await payload.delete({
            collection: 'presence-logs',
            id: payloadLogId,
          });
        } catch (revertError: unknown) {
          console.error('Failed to revert Payload presence log:', revertError);
        }
      }

      try {
        await prisma.presenceLog.delete({
          where: { uuid: prismaLog.uuid },
        });
      } catch (revertError: unknown) {
        console.error('Failed to revert Prisma presence log:', revertError);
      }

      try {
        await prisma.user.update({
          where: { uuid: user.uuid },
          data: { presentAtCamp: previousPresentAtCamp },
        });
      } catch (revertError: unknown) {
        console.error('Failed to revert Prisma user presence state:', revertError);
      }

      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to sync presence state to Payload CMS.',
        cause: payloadError,
      });
    }

    return {
      success: true,
      presentAtCamp: updatedUser.presentAtCamp,
    };
  });
