'use server';

import { environmentVariables } from '@/config/environment-variables';
import type { HitobitoNextAuthUser } from '@/types/hitobito-next-auth-user';
import type { StaticTranslationString } from '@/types/types';
import { auth, getPayloadUserFromNextAuthUser } from '@/utils/auth-helpers';
import config from '@payload-config';
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
const publicKey: string | undefined = environmentVariables.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey: string | undefined = environmentVariables.VAPID_PRIVATE_KEY;

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
): Promise<{ success: boolean }> {
  const payload = await getPayload({ config });
  const session = await auth();

  const hitobito_user = session?.user as HitobitoNextAuthUser;

  // eslint-disable-next-line unicorn/no-null
  const payloadUser = (await getPayloadUserFromNextAuthUser(payload, hitobito_user)) ?? null;

  const isProductionDeployment =
    environmentVariables.NEXT_PUBLIC_APP_HOST_URL.includes('conveniat27');

  if (payloadUser) {
    // check if the user already has a subscription
    const existingSubscription = await payload.find({
      collection: 'push-notification-subscriptions',
      where: {
        user: {
          equals: payloadUser.id,
        },
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
        },
      });
    } else {
      await payload.create({
        collection: 'push-notification-subscriptions',
        data: { ...sub, user: payloadUser },
      });
    }
  } else {
    // create a new one
    await payload.create({
      collection: 'push-notification-subscriptions',
      data: { ...sub },
    });
  }

  // send a test notification to the user
  try {
    await webpush.sendNotification(
      sub,
      JSON.stringify({
        title: 'conveniat27',
        body: subscribedConfirmationPush[locale],
      }),
    );
  } catch (error) {
    console.error('Error sending test notification:', error);
    throw new Error('Failed to send test notification');
  }

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
  subscription: webpush.PushSubscription,
  message: string,
  url?: string,
): Promise<{ success: boolean; error?: string }> {
  const urlToSend = url && url == '' ? undefined : url; // empty url is undefined
  try {
    await webpush.sendNotification(
      subscription,
      JSON.stringify({
        title: 'conveniat27',
        body: message,
        data: {
          url: urlToSend,
        },
      }),
    );

    return { success: true };
  } catch (error) {
    console.error('Error sending push notification:', error);
    return { success: false, error: 'Failed to send notification' };
  }
}
