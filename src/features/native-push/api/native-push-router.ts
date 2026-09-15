import { createTRPCRouter, trpcAdminProcedure, trpcBaseProcedure } from '@/trpc/init';
import { getPayloadUserFromNextAuthUser } from '@/utils/auth-helpers';
import { createLogger } from '@/utils/server-logger';
import config from '@payload-config';
import { TRPCError } from '@trpc/server';
import { getPayload } from 'payload';
import { z } from 'zod';

const logger = createLogger('native-push');

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
      logger.debug('registerDevice called', { 'push.platform': input.platform });

      const payload = await getPayload({ config });
      const payloadUser = await getPayloadUserFromNextAuthUser(payload, ctx.user);

      if (!payloadUser) {
        logger.warn('registerDevice: user not found', { 'push.platform': input.platform });
        throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
      }

      /**
       * Stores the subscription for this device and reports whether it was newly
       * created.
       *
       * An upsert keyed on the unique `token`, not a delete-then-write. The old
       * sequence removed rows to make room for the write, which is what let parallel
       * registrations destroy each other: one call deleted the row another was about
       * to update. Claiming the existing row instead keeps its id stable, so the
       * worst a concurrent registration can do now is write the same values twice.
       *
       * Every lookup lives inside, so a retry sees whatever the competing write left
       * behind rather than a stale read.
       */
      const persistSubscription = async (): Promise<boolean> => {
        // Normalised once, then both stored and looked up in that form. Storing the
        // raw value while matching on the trimmed one would make a padded id - a
        // legacy or hand-edited `localStorage` entry - fail to find its own row on
        // every token rotation, and each rotation would add another subscription.
        const deviceId = input.deviceId?.trim();

        const data = {
          platform: input.platform,
          token: input.token,
          user: payloadUser.id,
          // eslint-disable-next-line unicorn/no-null
          deviceId: deviceId ?? null,
          lastUsedAt: new Date().toISOString(),
        };

        // `token` is unique, so at most one row can hold it. Whoever owned that row
        // before - this user on an earlier launch, or another account that used this
        // device - it is claimed rather than deleted and recreated. The unique index
        // already guarantees what the old delete was enforcing by hand.
        const rowsForToken = await payload.find({
          collection: 'push-notification-subscriptions',
          where: { token: { equals: input.token } },
          limit: 1,
        });
        const tokenRowId = rowsForToken.docs[0]?.id;
        if (tokenRowId !== undefined) {
          await payload.update({
            collection: 'push-notification-subscriptions',
            id: tokenRowId,
            data,
          });
          return false;
        }

        // Same device, rotated token: FCM issued a new one and this user's existing
        // row still points at the old. Update it in place, otherwise it lingers as a
        // subscription that can never be delivered to again.
        if (deviceId !== undefined && deviceId !== '') {
          const rowsForDevice = await payload.find({
            collection: 'push-notification-subscriptions',
            where: {
              and: [{ user: { equals: payloadUser.id } }, { deviceId: { equals: deviceId } }],
            },
            limit: 1,
          });
          const deviceRowId = rowsForDevice.docs[0]?.id;
          if (deviceRowId !== undefined) {
            await payload.update({
              collection: 'push-notification-subscriptions',
              id: deviceRowId,
              data,
            });
            return false;
          }
        }

        // Nothing to claim. A concurrent registration can still take the token
        // between the lookup above and this create; that one fails on the unique
        // index and the retry finds the row it created.
        await payload.create({ collection: 'push-notification-subscriptions', data });

        // Only after the row exists: a welcome push is sent below on the strength of
        // this flag, and claiming a successful subscription that was never stored is
        // exactly the lie this endpoint used to tell.
        return true;
      };

      let isNewSubscription = false;

      try {
        isNewSubscription = await persistSubscription();
      } catch (firstAttemptError: unknown) {
        const firstMessage =
          firstAttemptError instanceof Error
            ? firstAttemptError.message
            : String(firstAttemptError);

        // With the upsert above, the remaining race is the create: two registrations
        // for a token nobody holds yet, one of which loses on the unique index.
        // Writing again off a fresh read is the recovery - by now the winner's row
        // exists, so this attempt claims it instead of creating a second one.
        try {
          isNewSubscription = await persistSubscription();
          logger.warn('registerDevice: first write attempt lost a race, retry stored it', {
            'user.id': payloadUser.id,
            'error.message': firstMessage,
          });
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);

          // Two registrations for the same token can race here and one loses. That is
          // harmless as long as *this user's* subscription exists afterwards, so check
          // before deciding. The user filter matters: `token` is unique, so two accounts
          // registering the same device concurrently produce a duplicate-key error for
          // the loser, and a token-only query would happily match the winner's row and
          // report success for a subscription that was never stored for this user.
          // Anything else is a real failure and must not be reported as success either:
          // the client sets "registered" on a resolved call, so swallowing this left
          // users believing push was on while no subscription existed - silently,
          // permanently, and with a "you have successfully subscribed" push to confirm it.
          let isPersisted = false;
          try {
            const persisted = await payload.find({
              collection: 'push-notification-subscriptions',
              where: {
                and: [{ token: { equals: input.token } }, { user: { equals: payloadUser.id } }],
              },
              limit: 1,
            });
            isPersisted = persisted.totalDocs > 0;
          } catch (verificationError: unknown) {
            logger.error('registerDevice: could not verify subscription after write failure', {
              'user.id': payloadUser.id,
              error: verificationError,
            });
          }

          if (!isPersisted) {
            logger.error('registerDevice: failed to store subscription', {
              'user.id': payloadUser.id,
              'push.platform': input.platform,
              'error.message': message,
            });
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: 'Failed to store push subscription',
            });
          }

          logger.warn('registerDevice: write lost a race but the subscription exists', {
            'user.id': payloadUser.id,
            'error.message': message,
          });
        }
      }

      // The one line per registration that says push coverage is growing. Info, not
      // debug: how many devices register during an event is the number to read back
      // from Loki when a chat reaches fewer people than it should.
      logger.info('registerDevice: subscription stored', {
        'user.id': payloadUser.id,
        'push.platform': input.platform,
        'push.new_subscription': isNewSubscription,
      });

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
          logger.debug('registerDevice: welcome notification sent', {
            'user.id': payloadUser.id,
            'push.success': result.success,
          });
        } catch (pushError) {
          logger.warn('registerDevice: failed to send welcome notification', {
            'user.id': payloadUser.id,
            error: pushError,
          });
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
      logger.debug('unregisterDevice called', { 'push.platform': input.platform });

      const payload = await getPayload({ config });
      const payloadUser = await getPayloadUserFromNextAuthUser(payload, ctx.user);

      if (!payloadUser) {
        logger.warn('unregisterDevice: user not found', { 'push.platform': input.platform });
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

      logger.info('unregisterDevice: subscription removed', {
        'user.id': payloadUser.id,
        'push.platform': input.platform,
        'push.removed': deleted.docs.length,
      });
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
