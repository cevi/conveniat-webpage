import { DatabasePushSubscriptionSchema, PushSubscriptionSchema } from '@/schemas/push';
import { createTRPCRouter, publicProcedure, trpcAdminProcedure } from '@/trpc/init';
import { z } from 'zod';

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

  // Admin only: it pushes arbitrary text to any subscription the caller names.
  sendTestNotification: trpcAdminProcedure
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
  getRecentLogs: trpcAdminProcedure
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
