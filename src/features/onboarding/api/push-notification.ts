'use server';

import webpush from 'web-push';
import type { Where } from 'payload';
import { getPayload } from 'payload';
import config from '@payload-config';
import { auth, getPayloadUserFromNextAuthUser } from '@/utils/auth-helpers';
import type { HitobitoNextAuthUser } from '@/types/hitobito-next-auth-user';
import type { StaticTranslationString } from '@/types/types';
import { environmentVariables } from '@/config/environment-variables';

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
  await payload.create({
    collection: 'push-notification-subscriptions',
    data: { ...sub, user: payloadUser },
  });

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

/**
 * Sends a push notification to the user.
 * @param message
 */
export async function sendNotification(message: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const payload = await getPayload({ config });

  const { totalDocs } = await payload.count({ collection: 'push-notification-subscriptions' });
  if (totalDocs === 0) {
    throw new Error('No subscription available');
  }

  const { docs: subscriptions } = await payload.find({
    collection: 'push-notification-subscriptions',
    depth: 0,
  });

  console.log(`Sending notification to ${subscriptions.length} subscriptions`);

  try {
    const webPushPromises = subscriptions.map((subscription) => {
      return sendNotificationToSubscription(
        subscription as webpush.PushSubscription,
        message,
      ).catch((error: unknown) => {
        console.error(`Error sending notification to subscription ${subscription.id}:`, error);
        throw new Error(`Failed to send notification to subscription ${subscription.id}`); // Rethrow the error to be caught in the outer catch block
      });
    });
    await Promise.all(webPushPromises);

    console.log('Push notifications sent successfully');

    return { success: true };
  } catch (error) {
    console.error('Error sending push notification:', error);
    return { success: false, error: 'Failed to send notification' };
  }
}

export async function sendNotificationToSubscription(
  subscription: webpush.PushSubscription,
  message: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await webpush.sendNotification(
      subscription,
      JSON.stringify({
        title: 'conveniat27',
        body: message,
      }),
    );

    return { success: true };
  } catch (error) {
    console.error('Error sending push notification:', error);
    return { success: false, error: 'Failed to send notification' };
  }
}
