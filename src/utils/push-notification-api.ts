'use server';

import { sendNotificationToSubscription } from '@/lib/push/send-notification-to-subscription';
import type { StaticTranslationString } from '@/types/types';
import { auth } from '@/utils/auth';
import { getPayloadUserFromNextAuthUser, isValidNextAuthUser } from '@/utils/auth-helpers';
import config from '@payload-config';
import type { Where } from 'payload';
import { getPayload } from 'payload';
import type webpush from 'web-push';

type WebPushSubscription = webpush.PushSubscription;

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
  sub: WebPushSubscription,
  locale: 'de' | 'fr' | 'en',
  userAgent?: string,
  registrationSource?: '/entrypoint' | '/app/settings',
  deviceId?: string,
): Promise<{ success: boolean }> {
  const payload = await getPayload({ config });
  const session = await auth();

  if (!isValidNextAuthUser(session?.user)) {
    return { success: false };
  }

  const hitobitoUser = session.user;

  // eslint-disable-next-line unicorn/no-null
  const payloadUser = (await getPayloadUserFromNextAuthUser(payload, hitobitoUser)) ?? null;

  if (payloadUser) {
    // 1. First check if a subscription exists for this specific endpoint or deviceId for this user
    const existingSubscription = await payload.find({
      collection: 'push-notification-subscriptions',
      where: {
        and: [
          { user: { equals: payloadUser.id } },
          {
            or: [
              { endpoint: { equals: sub.endpoint } },
              ...(deviceId && deviceId.trim() !== '' ? [{ deviceId: { equals: deviceId } }] : []),
            ],
          },
        ],
      },
      limit: 1,
    });

    // 2. Global cleanup: delete any existing subscription with the exact same endpoint assigned to other records
    if (existingSubscription.totalDocs > 0 && existingSubscription.docs[0]?.id) {
      const existingId = existingSubscription.docs[0].id;
      // Delete any duplicate records matching this endpoint except our existing doc
      await payload.delete({
        collection: 'push-notification-subscriptions',
        where: {
          and: [{ endpoint: { equals: sub.endpoint } }, { id: { not_equals: existingId } }],
        },
      });

      await payload.update({
        collection: 'push-notification-subscriptions',
        id: existingId,
        data: {
          platform: 'web',
          endpoint: sub.endpoint,
          keys: sub.keys,
          user: payloadUser.id,
          // eslint-disable-next-line unicorn/no-null
          deviceId: deviceId ?? null,
          // eslint-disable-next-line unicorn/no-null
          userAgent: userAgent ?? null,
          // eslint-disable-next-line unicorn/no-null
          registrationSource: registrationSource ?? null,
          lastUsedAt: new Date().toISOString(),
        },
      });
    } else {
      await payload.delete({
        collection: 'push-notification-subscriptions',
        where: {
          endpoint: { equals: sub.endpoint },
        },
      });

      await payload.create({
        collection: 'push-notification-subscriptions',
        data: {
          platform: 'web',
          endpoint: sub.endpoint,
          keys: sub.keys,
          user: payloadUser.id,
          // eslint-disable-next-line unicorn/no-null
          deviceId: deviceId ?? null,
          // eslint-disable-next-line unicorn/no-null
          userAgent: userAgent ?? null,
          // eslint-disable-next-line unicorn/no-null
          registrationSource: registrationSource ?? null,
          lastUsedAt: new Date().toISOString(),
        },
      });
    }
  } else {
    // Create unauthenticated web subscription if needed
    await payload.create({
      collection: 'push-notification-subscriptions',
      data: {
        platform: 'web',
        endpoint: sub.endpoint,
        keys: sub.keys,
        // eslint-disable-next-line unicorn/no-null
        deviceId: deviceId ?? null,
        // eslint-disable-next-line unicorn/no-null
        userAgent: userAgent ?? null,
        // eslint-disable-next-line unicorn/no-null
        registrationSource: registrationSource ?? null,
        lastUsedAt: new Date().toISOString(),
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
 *
 * Removes the row only for the session that owns it. The endpoint and keys alone prove
 * nothing here: they are stored on the row, so anyone who can read one could delete it.
 */
export async function unsubscribeUser(sub: WebPushSubscription): Promise<{ success: boolean }> {
  const payload = await getPayload({ config });
  const session = await auth();

  if (!isValidNextAuthUser(session?.user)) {
    return { success: false };
  }

  const payloadUser = await getPayloadUserFromNextAuthUser(payload, session.user);

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
      // `subscribeUser` stores a row without an owner for a session that has no Payload user.
      { user: payloadUser ? { equals: payloadUser.id } : { exists: false } },
    ],
  };

  await payload.delete({
    collection: 'push-notification-subscriptions',
    where: query,
    depth: 0,
  });

  return { success: true };
}
