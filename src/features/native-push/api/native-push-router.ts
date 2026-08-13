import { createTRPCRouter, trpcAdminProcedure, trpcBaseProcedure } from '@/trpc/init';
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
        deviceId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      console.log('[NativePush:API] registerDevice: platform =', input.platform);

      const payload = await getPayload({ config });
      const payloadUser = await getPayloadUserFromNextAuthUser(payload, ctx.user);

      if (!payloadUser) {
        console.warn('[NativePush:API] registerDevice: user not found');
        throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
      }

      console.log(
        '[NativePush:API] registerDevice: user =',
        payloadUser.id,
        '| deduplicating existing token/device',
      );

      // Check if this specific user already has a subscription for this deviceId or token
      const existingSubscription = await payload.find({
        collection: 'push-notification-subscriptions',
        where: {
          and: [
            { user: { equals: payloadUser.id } },
            {
              or: [
                { token: { equals: input.token } },
                ...(input.deviceId && input.deviceId.trim() !== ''
                  ? [{ deviceId: { equals: input.deviceId } }]
                  : []),
              ],
            },
          ],
        },
        limit: 1,
      });

      let isNewSubscription = false;

      try {
        if (existingSubscription.totalDocs > 0 && existingSubscription.docs[0]?.id) {
          const existingId = existingSubscription.docs[0].id;
          // Delete any existing subscriptions with the exact same token belonging to other records
          await payload.delete({
            collection: 'push-notification-subscriptions',
            where: {
              and: [{ token: { equals: input.token } }, { id: { not_equals: existingId } }],
            },
          });

          await payload.update({
            collection: 'push-notification-subscriptions',
            id: existingId,
            data: {
              platform: input.platform,
              token: input.token,
              user: payloadUser.id,
              // eslint-disable-next-line unicorn/no-null
              deviceId: input.deviceId ?? null,
              lastUsedAt: new Date().toISOString(),
            },
          });
        } else {
          // Delete any existing subscriptions with the exact same token globally to ensure token uniqueness
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
              // eslint-disable-next-line unicorn/no-null
              deviceId: input.deviceId ?? null,
              lastUsedAt: new Date().toISOString(),
            },
          });
          // Only after the row exists: a welcome push is sent below on the strength of
          // this flag, and claiming a successful subscription that was never stored is
          // exactly the lie this endpoint used to tell.
          isNewSubscription = true;
        }
        console.log(
          '[NativePush:API] registerDevice: success — token registered for user',
          payloadUser.id,
          'isNew =',
          isNewSubscription,
        );
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);

        // Two registrations for the same token can race here and one loses. That is
        // harmless as long as the subscription exists afterwards, so check before
        // deciding. Anything else is a real failure and must not be reported as
        // success: the client sets "registered" on a resolved call, so swallowing this
        // left users believing push was on while no subscription existed - silently,
        // permanently, and with a "you have successfully subscribed" push to confirm it.
        let isPersisted = false;
        try {
          const persisted = await payload.find({
            collection: 'push-notification-subscriptions',
            where: { token: { equals: input.token } },
            limit: 1,
          });
          isPersisted = persisted.totalDocs > 0;
        } catch (verificationError: unknown) {
          console.error(
            '[NativePush:API] registerDevice: could not verify subscription after write failure:',
            verificationError,
          );
        }

        if (!isPersisted) {
          console.error('[NativePush:API] registerDevice: failed to store subscription:', message);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to store push subscription',
          });
        }

        console.warn(
          '[NativePush:API] registerDevice: write lost a race but the subscription exists:',
          message,
        );
      }

      // Send welcome confirmation push notification ONLY when creating a brand new subscription
      if (isNewSubscription) {
        try {
          const { sendFcmNotification } = await import('@/lib/firebase-admin');
          const targetLocale: 'de' | 'fr' | 'en' =
            ctx.locale === 'fr' || ctx.locale === 'en' ? ctx.locale : 'de';
          const welcomeMessages: Record<'de' | 'fr' | 'en', string> = {
            de: 'Du hast dich erfolgreich für Push-Benachrichtigungen angemeldet.',
            fr: 'Vous vous êtes inscrit avec succès aux notifications push.',
            en: 'You have successfully subscribed to push notifications.',
          };
          const bodyText = welcomeMessages[targetLocale];

          const result = await sendFcmNotification(input.token, {
            title: 'Konekta',
            body: bodyText,
            data: {
              url: '/app/settings',
            },
          });
          console.log(
            '[NativePush:API] registerDevice: welcome notification sent, result =',
            result,
          );
        } catch (pushError) {
          console.warn(
            '[NativePush:API] registerDevice: failed to send welcome notification:',
            pushError,
          );
        }
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
      console.log('[NativePush:API] unregisterDevice: platform =', input.platform);

      const payload = await getPayload({ config });
      const payloadUser = await getPayloadUserFromNextAuthUser(payload, ctx.user);

      if (!payloadUser) {
        console.warn('[NativePush:API] unregisterDevice: user not found');
        throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
      }

      const deleted = await payload.delete({
        collection: 'push-notification-subscriptions',
        where: {
          and: [
            { token: { equals: input.token } },
            { platform: { equals: input.platform } },
            { user: { equals: payloadUser.id } },
          ],
        },
      });

      console.log(
        '[NativePush:API] unregisterDevice: removed',
        deleted.docs.length,
        'record(s) for user',
        payloadUser.id,
      );
      return { success: true };
    }),

  sendWebPushNotification: trpcAdminProcedure
    .input(
      z.object({
        subscription: z.object({
          endpoint: z.string(),
          keys: z.object({
            p256dh: z.string(),
            auth: z.string(),
          }),
        }),
        message: z.string(),
        url: z.string().optional(),
        userId: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { sendNotificationToSubscription } = await import('@/utils/push-notification-api');
      return sendNotificationToSubscription(
        input.subscription,
        input.message,
        input.url,
        input.userId,
      );
    }),
});
