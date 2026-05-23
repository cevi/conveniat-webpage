import { createTRPCRouter, trpcBaseProcedure } from '@/trpc/init';
import { getPayloadUserFromNextAuthUser } from '@/utils/auth-helpers';
import config from '@payload-config';
import { TRPCError } from '@trpc/server';
import { getPayload } from 'payload';
import { z } from 'zod';

export const nativePushRouter = createTRPCRouter({
  registerDevice: trpcBaseProcedure
    .input(
      z.object({
        token: z.string().min(1),
        platform: z.enum(['ios', 'android']),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const payload = await getPayload({ config });
      const payloadUser = await getPayloadUserFromNextAuthUser(payload, ctx.user);

      if (!payloadUser) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
      }

      // Delete any existing subscriptions with the same token globally to ensure uniqueness
      await payload.delete({
        collection: 'push-notification-subscriptions',
        where: {
          token: { equals: input.token },
        },
      });

      try {
        await payload.create({
          collection: 'push-notification-subscriptions',
          data: {
            platform: input.platform,
            token: input.token,
            user: payloadUser.id,
          },
        });
      } catch (error: unknown) {
        // Under concurrent requests, the delete+create pattern is non-atomic.
        // If a duplicate key error occurs, we assume the token is already registered.
        const message = error instanceof Error ? error.message : String(error);
        console.warn(
          'Failed to create push notification subscription (possibly concurrent duplicate):',
          message,
        );
      }

      return { success: true };
    }),

  unregisterDevice: trpcBaseProcedure
    .input(
      z.object({
        token: z.string().min(1),
        platform: z.enum(['ios', 'android']),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const payload = await getPayload({ config });
      const payloadUser = await getPayloadUserFromNextAuthUser(payload, ctx.user);

      if (!payloadUser) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
      }

      await payload.delete({
        collection: 'push-notification-subscriptions',
        where: {
          and: [
            { token: { equals: input.token } },
            { platform: { equals: input.platform } },
            { user: { equals: payloadUser.id } },
          ],
        },
      });

      return { success: true };
    }),
});
