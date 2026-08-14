'use server';

import { environmentVariables } from '@/config/environment-variables';
import type { PushNotificationSubscription } from '@/features/payload-cms/payload-types';
import { sendFcmNotification } from '@/lib/firebase-admin';
import { PushNotificationChannel } from '@/lib/prisma';
import type { DatabasePushSubscription, SchemaPushSubscription } from '@/schemas/push';
import type { StaticTranslationString } from '@/types/types';
import { auth } from '@/utils/auth';
import { getPayloadUserFromNextAuthUser, isValidNextAuthUser } from '@/utils/auth-helpers';
import config from '@payload-config';
import type { Where } from 'payload';
import { getPayload } from 'payload';
import type webpush from 'web-push';

type WebPushSubscription = webpush.PushSubscription;

const NEXT_PUBLIC_APP_HOST_URL = environmentVariables.NEXT_PUBLIC_APP_HOST_URL;

// vapid subject must be mailto or https, thus we fall back to https://conveniat27.ch
// if the NEXT_PUBLIC_APP_HOST_URL is not set or localhost
const subject: string =
  NEXT_PUBLIC_APP_HOST_URL !== '' && NEXT_PUBLIC_APP_HOST_URL.includes('https://')
    ? NEXT_PUBLIC_APP_HOST_URL
    : 'https://conveniat27.ch';
const publicKey: string = environmentVariables.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey: string = environmentVariables.VAPID_PRIVATE_KEY;

// Lazy-init web-push to avoid top-level side effects that break
// client-side module evaluation (web-push is Node.js-only).
let webpushInstance: typeof webpush | undefined;
async function getWebPush(): Promise<typeof webpush> {
  if (!webpushInstance) {
    const module_ = await import('web-push');
    webpushInstance = module_.default;
    const validatedPublicKey = typeof publicKey === 'string' ? publicKey.trim() : '';
    const validatedPrivateKey = typeof privateKey === 'string' ? privateKey.trim() : '';
    if (!validatedPublicKey || !validatedPrivateKey) {
      throw new Error(
        'Missing or invalid VAPID configuration: NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY must be non-empty strings.',
      );
    }
    webpushInstance.setVapidDetails(subject, validatedPublicKey, validatedPrivateKey);
  }
  return webpushInstance;
}

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
 */
export async function unsubscribeUser(sub: WebPushSubscription): Promise<{ success: boolean }> {
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
  subscription:
    | webpush.PushSubscription
    | PushNotificationSubscription
    | SchemaPushSubscription
    | DatabasePushSubscription,
  message: string,
  url?: string,
  userId?: string,
  existingLogId?: string,
  logContent?: string,
  options?: {
    ignoreIfAppOpen?: boolean;
    ignoreIfUrlMatches?: boolean;
    title?: string;
    /** Id of the underlying chat message, used by clients to de-duplicate push vs. SSE. */
    messageId?: string;
    /** Routes the push to the native siren channel/sound. See issue #47. */
    notificationType?: 'emergency';
  },
): Promise<{ success: boolean; error?: string }> {
  const urlToSend = url === '' ? undefined : url; // empty url is undefined
  const titleToSend = options?.title ?? 'conveniat27';
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
      if (!subscription.token) {
        throw new Error(`Native push token is missing for platform: ${subscription.platform}`);
      }

      let normalizedUrl = urlToSend;
      if (normalizedUrl) {
        if (NEXT_PUBLIC_APP_HOST_URL && normalizedUrl.startsWith(NEXT_PUBLIC_APP_HOST_URL)) {
          normalizedUrl = normalizedUrl.replace(NEXT_PUBLIC_APP_HOST_URL, '');
        } else {
          try {
            if (normalizedUrl.startsWith('http://') || normalizedUrl.startsWith('https://')) {
              const parsed = new URL(normalizedUrl);
              normalizedUrl = parsed.pathname + parsed.search;
            }
          } catch {
            // ignore URL parse errors
          }
        }
      }

      let chatIdFromUrl: string | undefined;
      if (typeof normalizedUrl === 'string' && normalizedUrl.includes('/app/chat/')) {
        const parts = normalizedUrl.split('/app/chat/');
        const firstPart = parts[1];
        if (typeof firstPart === 'string' && firstPart !== '') {
          chatIdFromUrl = firstPart.split('?')[0];
        }
      }

      const result = await sendFcmNotification(subscription.token, {
        title: titleToSend,
        body: message,
        data: {
          ...(normalizedUrl !== undefined && { url: normalizedUrl }),
          ...(normalizedUrl !== undefined && { path: normalizedUrl }),
          ...(normalizedUrl !== undefined && { link: normalizedUrl }),
          ...(chatIdFromUrl !== undefined && { chatId: chatIdFromUrl }),
          ...(options?.messageId !== undefined && { messageId: options.messageId }),
          ...(logId !== undefined && { notificationId: logId }),
          ...(options?.ignoreIfAppOpen !== undefined && {
            ignoreIfAppOpen: options.ignoreIfAppOpen ? 'true' : 'false',
          }),
          ...(options?.ignoreIfUrlMatches !== undefined && {
            ignoreIfUrlMatches: options.ignoreIfUrlMatches ? 'true' : 'false',
          }),
          ...(options?.notificationType !== undefined && {
            notificationType: options.notificationType,
          }),
        },
      });
      if (!result.success) {
        const fcmError: Error & { fcmErrorCode?: string } = new Error(
          result.error ?? 'FCM send failed',
        );
        if (result.errorCode !== undefined) fcmError.fcmErrorCode = result.errorCode;
        throw fcmError;
      }
    } else {
      let webSub = subscription as webpush.PushSubscription;
      // If it's a Payload subscription, format it for web-push
      if ('endpoint' in subscription && 'keys' in subscription) {
        const keys = subscription.keys;
        if (!subscription.endpoint || !keys?.p256dh || !keys.auth) {
          throw new Error('Web Push subscription is missing required fields (endpoint or keys).');
        }
        webSub = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: keys.p256dh,
            auth: keys.auth,
          },
        };
      }

      const wp = await getWebPush();
      await wp.sendNotification(
        webSub,
        JSON.stringify({
          title: titleToSend,
          body: message,
          data: {
            url: urlToSend,
            notificationId: logId,
            ...(options?.messageId !== undefined && { messageId: options.messageId }),
            ...(options?.ignoreIfAppOpen !== undefined && {
              ignoreIfAppOpen: options.ignoreIfAppOpen ? 'true' : 'false',
            }),
            ...(options?.ignoreIfUrlMatches !== undefined && {
              ignoreIfUrlMatches: options.ignoreIfUrlMatches ? 'true' : 'false',
            }),
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

    if (
      'id' in subscription &&
      typeof subscription.id === 'string' &&
      subscription.id.trim() !== ''
    ) {
      try {
        const payload = await getPayload({ config });
        await payload.update({
          collection: 'push-notification-subscriptions',
          id: subscription.id,
          data: {
            lastUsedAt: new Date().toISOString(),
          },
        });
      } catch {
        // Non-critical background update
      }
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

    // Auto-prune dead/expired tokens from Payload CMS.
    //
    // FCM reports a dead token as the bare message `NotRegistered`, and a dead APNs token as
    // `APNs device token is disabled.`. The previous checks were case-sensitive and expected
    // hyphenated spellings, so neither matched: those subscriptions were never pruned and every
    // later notification retried them forever, filling the logs with the same two errors.
    // Prefer the machine-readable code and keep the message checks as a case-insensitive
    // fallback for the web-push side.
    const fcmErrorCode = (error as { fcmErrorCode?: string } | undefined)?.fcmErrorCode;
    const normalizedMessage = errorMessage.toLowerCase();

    const indicatesDeadToken =
      normalizedMessage.includes('notregistered') ||
      normalizedMessage.includes('not-registered') ||
      normalizedMessage.includes('invalid-registration-token') ||
      normalizedMessage.includes('registration-token-not-registered') ||
      normalizedMessage.includes('device token is disabled') ||
      normalizedMessage.includes('not a valid fcm registration token');

    const isExpired =
      fcmErrorCode === 'messaging/registration-token-not-registered' ||
      fcmErrorCode === 'messaging/invalid-registration-token' ||
      // `invalid-argument` is also raised for a malformed payload, which is our bug and not the
      // subscriber's - only treat it as fatal when the message actually names the token, so a
      // bad payload can never delete healthy subscriptions.
      (fcmErrorCode === 'messaging/invalid-argument' && indicatesDeadToken) ||
      indicatesDeadToken ||
      errorMessage.includes('410') ||
      errorMessage.includes('404') ||
      normalizedMessage.includes('not found') ||
      normalizedMessage.includes('gone');

    if (isExpired) {
      console.log('[PushNotification:API] Auto-pruning expired push subscription');
      try {
        const payload = await getPayload({ config });
        if (
          'endpoint' in subscription &&
          typeof subscription.endpoint === 'string' &&
          subscription.endpoint !== ''
        ) {
          await payload.delete({
            collection: 'push-notification-subscriptions',
            where: { endpoint: { equals: subscription.endpoint } },
          });
        } else if (
          'token' in subscription &&
          typeof subscription.token === 'string' &&
          subscription.token !== ''
        ) {
          await payload.delete({
            collection: 'push-notification-subscriptions',
            where: { token: { equals: subscription.token } },
          });
        } else if (
          'id' in subscription &&
          typeof subscription.id === 'string' &&
          subscription.id !== ''
        ) {
          await payload.delete({
            collection: 'push-notification-subscriptions',
            id: subscription.id,
          });
        }
      } catch (pruneError) {
        console.warn('Failed to prune expired push subscription:', pruneError);
      }
    }

    return { success: false, error: 'Failed to send notification' };
  }
}
