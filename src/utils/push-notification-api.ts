'use server';

import { environmentVariables } from '@/config/environment-variables';
import type { PushNotificationSubscription } from '@/features/payload-cms/payload-types';
import { sendFcmNotification } from '@/lib/firebase-admin';
import type { StaticTranslationString } from '@/types/types';
import { auth } from '@/utils/auth';
import { getPayloadUserFromNextAuthUser, isValidNextAuthUser } from '@/utils/auth-helpers';
import config from '@payload-config';
import { PushNotificationChannel } from '@prisma/client';
import type { Where } from 'payload';
import { getPayload } from 'payload';
import webpush from 'web-push';

const NEXT_PUBLIC_APP_HOST_URL = environmentVariables.NEXT_PUBLIC_APP_HOST_URL;

// vapid subject must be mailto or https, thus we fall back to https://conveniat27.ch
// if the NEXT_PUBLIC_APP_HOST_URL is not set or localhost
const subject: string | undefined =
  NEXT_PUBLIC_APP_HOST_URL !== '' && NEXT_PUBLIC_APP_HOST_URL.includes('https://')
    ? NEXT_PUBLIC_APP_HOST_URL
    : 'https://conveniat27.ch';
const publicKey: string = environmentVariables.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey: string = environmentVariables.VAPID_PRIVATE_KEY;

webpush.setVapidDetails(subject, publicKey, privateKey);

const subscribedConfirmationPush: StaticTranslationString = {
  de: 'Du hast dich erfolgreich für Push-Benachrichtigungen angemeldet.',
  fr: 'Vous vous êtes inscrit avec succès aux notifications push.',
  en: 'You have successfully subscribed to push notifications.',
};

/**
 * Subscribes the user to push notifications.
 *
 * @param sub
 * @param locale
 */
export async function subscribeUser(
  sub: webpush.PushSubscription,
  locale: 'de' | 'fr' | 'en',
  userAgent?: string,
  registrationSource?: '/entrypoint' | '/app/settings',
): Promise<{ success: boolean }> {
  const payload = await getPayload({ config });
  const session = await auth();

  if (!isValidNextAuthUser(session?.user)) {
    return { success: false };
  }

  const hitobito_user = session.user;

  // eslint-disable-next-line unicorn/no-null
  const payloadUser = (await getPayloadUserFromNextAuthUser(payload, hitobito_user)) ?? null;

  const isProductionDeployment =
    environmentVariables.NEXT_PUBLIC_APP_HOST_URL.includes('conveniat27');

  if (payloadUser) {
    // check if the user already has a web subscription
    const existingSubscription = await payload.find({
      collection: 'push-notification-subscriptions',
      where: {
        and: [{ user: { equals: payloadUser.id } }, { platform: { equals: 'web' } }],
      },
    });

    if (isProductionDeployment && existingSubscription.totalDocs > 0) {
      // if the user already has a subscription, we update it
      const existingSubscriptionId = existingSubscription.docs[0]?.id as string;
      await payload.update({
        collection: 'push-notification-subscriptions',
        id: existingSubscriptionId,
        data: {
          ...sub,
          user: payloadUser,
          // eslint-disable-next-line unicorn/no-null
          userAgent: userAgent ?? null,
          // eslint-disable-next-line unicorn/no-null
          registrationSource: registrationSource ?? null,
        },
      });
    } else {
      await payload.create({
        collection: 'push-notification-subscriptions',
        data: {
          platform: 'web',
          endpoint: sub.endpoint,
          keys: sub.keys,
          user: payloadUser.id,
          // eslint-disable-next-line unicorn/no-null
          userAgent: userAgent ?? null,
          // eslint-disable-next-line unicorn/no-null
          registrationSource: registrationSource ?? null,
        },
      });
    }
  } else {
    // create a new one
    await payload.create({
      collection: 'push-notification-subscriptions',
      data: {
        platform: 'web',
        endpoint: sub.endpoint,
        keys: sub.keys,
        // eslint-disable-next-line unicorn/no-null
        userAgent: userAgent ?? null,
        // eslint-disable-next-line unicorn/no-null
        registrationSource: registrationSource ?? null,
      },
    });
  }

  // send a test notification to the user
  await sendNotificationToSubscription(
    sub,
    subscribedConfirmationPush[locale],
    undefined, // no url
    payloadUser?.id, // log to user if exists
  );

  return { success: true };
}

/**
 * Unsubscribes the user from push notifications.
 */
export async function unsubscribeUser(
  sub: webpush.PushSubscription,
): Promise<{ success: boolean }> {
  const payload = await getPayload({ config });

  const query: Where = {
    and: [
      {
        endpoint: { equals: sub.endpoint },
      },
      {
        keys: {
          equals: {
            p256dh: sub.keys.p256dh,
            auth: sub.keys.auth,
          },
        },
      },
    ],
  };

  await payload.delete({
    collection: 'push-notification-subscriptions',
    where: query,
    depth: 0,
  });

  return { success: true };
}

export async function sendNotificationToSubscription(
  subscription: webpush.PushSubscription | PushNotificationSubscription,
  message: string,
  url?: string,
  userId?: string,
  existingLogId?: string,
  logContent?: string,
): Promise<{ success: boolean; error?: string }> {
  const urlToSend = url === '' ? undefined : url; // empty url is undefined
  const { default: prisma } = await import('@/lib/db/prisma');
  let logId = existingLogId;

  const isNative =
    'platform' in subscription &&
    (subscription.platform === 'ios' || subscription.platform === 'android');
  const channel = isNative ? PushNotificationChannel.NATIVE_FCM : PushNotificationChannel.WEB_PUSH;

  // If userId is provided and no existingLogId, create a new log entry
  if (userId && !logId) {
    try {
      const log = await prisma.pushNotificationLog.create({
        data: {
          userId,
          content: logContent ?? message,
          status: 'PENDING',
          channel,
        },
      });
      logId = log.id;
    } catch (error) {
      console.error('Failed to create push notification log', error);
      // We continue even if validation fails, but logging won't happen
    }
  }

  try {
    if (
      'platform' in subscription &&
      (subscription.platform === 'ios' || subscription.platform === 'android')
    ) {
      if (!subscription.token) throw new Error('Native token is missing');
      const result = await sendFcmNotification(subscription.token, {
        title: 'conveniat27',
        body: message,
        data: {
          ...(urlToSend !== undefined && { url: urlToSend }),
          ...(logId !== undefined && { notificationId: logId }),
        },
      });
      if (!result.success) throw new Error(result.error);
    } else {
      let webSub = subscription as webpush.PushSubscription;
      // If it's a Payload subscription, format it for web-push
      if ('endpoint' in subscription && 'keys' in subscription && 'platform' in subscription) {
        webSub = {
          endpoint: subscription.endpoint ?? '',
          keys: {
            p256dh: subscription.keys.p256dh ?? '',
            auth: subscription.keys.auth ?? '',
          },
        };
      }

      await webpush.sendNotification(
        webSub,
        JSON.stringify({
          title: 'conveniat27',
          body: message,
          data: {
            url: urlToSend,
            notificationId: logId,
          },
        }),
      );
    }

    if (logId) {
      await prisma.pushNotificationLog.update({
        where: { id: logId },
        data: {
          status: 'DELIVERED',
          deliveredAt: new Date(),
        },
      });
    }

    return { success: true };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error sending push notification:', error);

    if (logId) {
      await prisma.pushNotificationLog.update({
        where: { id: logId },
        data: {
          status: 'FAILED',
          error: errorMessage,
        },
      });
    }

    return { success: false, error: 'Failed to send notification' };
  }
}
