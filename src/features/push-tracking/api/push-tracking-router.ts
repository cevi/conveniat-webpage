import { DatabasePushSubscriptionSchema, PushSubscriptionSchema } from '@/schemas/push';
import { createTRPCRouter, publicProcedure, trpcFullAdminProcedure } from '@/trpc/init';
import { createLogger } from '@/utils/server-logger';
import config from '@payload-config';
import { getPayload } from 'payload';
import { z } from 'zod';

const logger = createLogger('push:tracking');

const endpointHostOf = (endpoint: string): string | undefined => {
  try {
    return new URL(endpoint).host;
  } catch {
    return undefined;
  }
};

/**
 * `markDelivered` and `markInteracted` stay public: the service worker calls them, possibly
 * without a session, and a log id is a UUIDv7 with 74 random bits, so it cannot be guessed.
 */
export const pushTrackingRouter = createTRPCRouter({
  markDelivered: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // In a real scenario, we might want to verify the user or some token
      // but for now we trust the ID exists.
      await ctx.prisma.pushNotificationLog.update({
        where: { id: input.id },
        data: {
          deliveredAt: new Date(),
        },
      });
      return { success: true };
    }),

  markInteracted: publicProcedure
    .input(
      z.object({
        id: z.string(),
        type: z.enum(['CLICK', 'DISMISS']),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.pushNotificationLog.update({
        where: { id: input.id },
        data: {
          interactedAt: new Date(),
          interactionType: input.type,
        },
      });
      return { success: true };
    }),

  /**
   * Points a stored Web Push subscription at the one the browser replaced it with, after
   * `pushsubscriptionchange` or a VAPID key change. Public like the two above, because the
   * service worker calls it without a session. Only a caller holding the old subscription's
   * auth secret, 16 random bytes shared by that browser and this server, can match the row.
   */
  renewWebPushSubscription: publicProcedure
    .input(
      z.object({
        oldSubscription: PushSubscriptionSchema,
        newSubscription: PushSubscriptionSchema,
      }),
    )
    .mutation(async ({ input }) => {
      const { oldSubscription, newSubscription } = input;
      const payload = await getPayload({ config });

      const { docs } = await payload.find({
        collection: 'push-notification-subscriptions',
        where: {
          and: [
            { endpoint: { equals: oldSubscription.endpoint } },
            { 'keys.auth': { equals: oldSubscription.keys.auth } },
          ],
        },
        limit: 1,
        depth: 0,
      });
      const stored = docs[0];
      const logAttributes = {
        'server.address': endpointHostOf(newSubscription.endpoint),
        'user.id': typeof stored?.user === 'string' ? stored.user : undefined,
      };

      // A send that hit the dead endpoint in the meantime answered 410 and pruned the row.
      if (stored === undefined) {
        logger.info('No stored push subscription to renew', logAttributes);
        return { renewed: false };
      }

      await payload.update({
        collection: 'push-notification-subscriptions',
        id: stored.id,
        data: {
          endpoint: newSubscription.endpoint,
          keys: newSubscription.keys,
          lastUsedAt: new Date().toISOString(),
        },
      });
      logger.info('Renewed push subscription', logAttributes);
      return { renewed: true };
    }),

  // Admin only: it pushes arbitrary text to any subscription the caller names.
  sendTestNotification: trpcFullAdminProcedure
    .input(
      z.object({
        subscription: z.union([PushSubscriptionSchema, DatabasePushSubscriptionSchema]),
        message: z.string(),
        url: z.string().optional(),
        userId: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { sendNotificationToSubscription } = await import('@/utils/push-notification-api');

      return await sendNotificationToSubscription(
        input.subscription,
        input.message,
        input.url,
        input.userId,
      );
    }),

  // Admin only: it returns what any person was sent, for the push subscription admin page.
  getRecentLogs: trpcFullAdminProcedure
    .input(
      z.object({
        userId: z.string(),
        limit: z.number().min(1).max(100).default(5),
        cursor: z.string().nullish(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { limit, cursor, userId } = input;
      const items = await ctx.prisma.pushNotificationLog.findMany({
        take: limit + 1, // get an extra item at the end which we'll use as next cursor
        where: {
          userId: userId,
        },
        ...(cursor !== undefined && cursor !== null && cursor !== ''
          ? { cursor: { id: cursor } }
          : {}),
        orderBy: {
          sentAt: 'desc',
        },
      });

      let nextCursor: typeof cursor | undefined;
      if (items.length > limit) {
        const nextItem = items.pop();
        // nextItem is guaranteed to exist since we checked items.length > limit
        nextCursor = nextItem?.id;
      }

      return {
        items,
        nextCursor,
      };
    }),
});
