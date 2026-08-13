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
        console.log(
          '[NativePush:API] registerDevice: success — token registered for user',
          payloadUser.id,
          'isNew =',
          isNewSubscription,
        );
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
          console.warn(
            '[NativePush:API] registerDevice: first write attempt lost a race, retry stored it:',
            firstMessage,
          );
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
            console.error(
              '[NativePush:API] registerDevice: could not verify subscription after write failure:',
              verificationError,
            );
          }

          if (!isPersisted) {
            console.error(
              '[NativePush:API] registerDevice: failed to store subscription:',
              message,
            );
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
