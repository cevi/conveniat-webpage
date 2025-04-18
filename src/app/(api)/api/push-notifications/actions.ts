'use server';

import webpush from 'web-push';
import { getPayload, Where } from 'payload';
import config from '@payload-config';
import { auth } from '@/auth/auth';
import { getPayloadUserFromNextAuthUser } from '@/auth/auth-helpers';
import { HitobitoNextAuthUser } from '@/auth/hitobito-next-auth-user';

const subject: string | undefined = process.env['NEXT_PUBLIC_APP_HOST_URL'];
const publicKey: string | undefined = process.env['NEXT_PUBLIC_VAPID_PUBLIC_KEY'];
const privateKey: string | undefined = process.env['VAPID_PRIVATE_KEY'];

if (subject === undefined || publicKey === undefined || privateKey === undefined) {
  throw new Error('VAPID keys are not set in the environment variables');
} else if (subject === '' || publicKey === '' || privateKey === '') {
  throw new Error('VAPID keys are empty');
}

webpush.setVapidDetails(subject, publicKey, privateKey);

/**
 * Subscribes the user to push notifications.
 *
 * @param sub
 */
export async function subscribeUser(sub: webpush.PushSubscription): Promise<{ success: boolean }> {
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
        // TODO: use a translation function
        body: 'You have successfully subscribed to push notifications!',
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
