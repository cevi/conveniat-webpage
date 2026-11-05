import { recordPushTrackingEvent } from '@/lib/push-metrics';
import { endpointHostOf } from '@/lib/push/push-endpoint';
import { DatabasePushSubscriptionSchema, PushSubscriptionSchema } from '@/schemas/push';
import { createTRPCRouter, publicProcedure, trpcFullAdminProcedure } from '@/trpc/init';
import { createLogger } from '@/utils/server-logger';
import config from '@payload-config';
import { headers } from 'next/headers';
import { getPayload } from 'payload';
import { z } from 'zod';

const logger = createLogger('push:tracking');

/** Longer user agents are client hints stuffed with noise, not more useful. */
const MAX_USER_AGENT_LENGTH = 512;

/**
 * The browser or app that reported back, so a log row says which device it reached.
 * Only a report carries it: the send happens on the server, which never sees the device.
 */
const reportingUserAgent = async (): Promise<string | undefined> => {
  const requestHeaders = await headers();
  const userAgent = requestHeaders.get('user-agent')?.trim();
  return userAgent === undefined || userAgent === ''
    ? undefined
    : userAgent.slice(0, MAX_USER_AGENT_LENGTH);
};

/**
 * `markDelivered` and `markInteracted` stay public: the service worker calls them, possibly
 * without a session, and a log id is a UUIDv7 with 74 random bits, so it cannot be guessed.
 */
export const pushTrackingRouter = createTRPCRouter({
  /**
   * The device received the push. The server only knows that the push service accepted
   * it (SENT), so this is the one place a row becomes DELIVERED.
   *
   * `presentation` is SUPPRESSED when the device kept the push out of the notification
   * shade because the app was open on its target. Service workers installed before it
   * existed send no `presentation`.
   */
  markDelivered: publicProcedure
    .input(
      z.object({
        id: z.string(),
        presentation: z.enum(['SHOWN', 'SUPPRESSED']).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const isSuppressed = input.presentation === 'SUPPRESSED';
      const userAgent = await reportingUserAgent();
      const log = await ctx.prisma.pushNotificationLog.update({
        where: { id: input.id },
        data: {
          status: 'DELIVERED',
          deliveredAt: new Date(),
          ...(isSuppressed && { interactionType: 'SUPPRESSED' }),
          ...(userAgent !== undefined && { userAgent }),
        },
        select: { channel: true, kind: true },
      });
      recordPushTrackingEvent(isSuppressed ? 'suppressed' : 'delivered', log.channel, log.kind);
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
      const userAgent = await reportingUserAgent();
      const log = await ctx.prisma.pushNotificationLog.update({
        where: { id: input.id },
        data: {
          interactedAt: new Date(),
          interactionType: input.type,
          ...(userAgent !== undefined && { userAgent }),
        },
        select: { channel: true, kind: true },
      });
      recordPushTrackingEvent(input.type === 'CLICK' ? 'click' : 'dismiss', log.channel, log.kind);
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
      const { sendNotificationToSubscription } =
        await import('@/lib/push/send-notification-to-subscription');

      return await sendNotificationToSubscription(
        input.subscription,
        input.message,
        input.url,
        input.userId,
      );
    }),

  // Admin only: it returns what any person was sent, for the push subscription admin page.
  /**
   * The push devices of one person, for the devices tab of a user in the admin panel. Full
   * admins only, like the subscriptions themselves: the rows say which devices someone uses.
   */
  getPushDeviceList: trpcFullAdminProcedure
    .input(z.object({ userId: z.string().min(1) }))
    .query(async ({ input }) => {
      const payload = await getPayload({ config });
      const { docs } = await payload.find({
        collection: 'push-notification-subscriptions',
        where: { user: { equals: input.userId } },
        sort: '-lastUsedAt',
        pagination: false,
        depth: 0,
        select: { platform: true, userAgent: true, registrationSource: true, lastUsedAt: true },
      });
      return docs.map((device) => ({
        id: device.id,
        platform: device.platform,
        userAgent: device.userAgent ?? null,
        registrationSource: device.registrationSource ?? null,
        lastUsedAt: device.lastUsedAt ?? null,
      }));
    }),

  /**
   * Removes one push device of a person. The device gets no pushes until the person turns them
   * on again in the settings. Deleting by `where` makes a device that is already gone, removed
   * in another tab or pruned by a send, a no-op instead of an error.
   */
  deletePushDevice: trpcFullAdminProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const payload = await getPayload({ config });
      const { docs } = await payload.delete({
        collection: 'push-notification-subscriptions',
        where: { id: { equals: input.id } },
        depth: 0,
      });
      const removed = docs[0];
      logger.info('Removed a push device in the admin panel', {
        'subscription.removed.count': docs.length,
        'device.platform': removed?.platform,
        'user.id': typeof removed?.user === 'string' ? removed.user : undefined,
      });
      return { removed: docs.length > 0 };
    }),

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
