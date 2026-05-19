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

      await payload.create({
        collection: 'push-notification-subscriptions',
        data: {
          platform: input.platform,
          token: input.token,
          user: payloadUser.id,
        },
      });

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
