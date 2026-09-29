'use server';

import type { NotificationType } from '@/lib/notification-type';
import { PushNotificationKind } from '@/lib/prisma';
import { recordPushSend } from '@/lib/push-metrics';
import { isUrgentKind, PUSH_TIME_TO_LIVE_SECONDS } from '@/lib/push/push-delivery-policy';
import type { PushDevice } from '@/lib/push/push-transport';
import { channelOf, composePushText, sendPushToDevice } from '@/lib/push/push-transport';
import type { StaticTranslationString } from '@/types/types';
import { auth } from '@/utils/auth';
import { getPayloadUserFromNextAuthUser, isValidNextAuthUser } from '@/utils/auth-helpers';
import { getAppShortName } from '@/utils/get-app-short-name';
import { createLogger } from '@/utils/server-logger';
import { withSpan } from '@/utils/tracing-helpers';
import { SpanStatusCode } from '@opentelemetry/api';
import config from '@payload-config';
import type { Where } from 'payload';
import { getPayload } from 'payload';
import type webpush from 'web-push';

type WebPushSubscription = webpush.PushSubscription;

const logger = createLogger('push:api');

const endpointHostOf = (endpoint: unknown): string | undefined => {
  if (typeof endpoint !== 'string') return undefined;
  try {
    return new URL(endpoint).host;
  } catch {
    return undefined;
  }
};

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

interface SendOptions {
  ignoreIfAppOpen?: boolean;
  ignoreIfUrlMatches?: boolean;
  title?: string;
  /** Id of the underlying chat message, used by clients to de-duplicate push vs. SSE. */
  messageId?: string;
  /**
   * How urgently the notification should be presented. `emergency` routes native
   * pushes to the siren channel; see {@link NotificationType}.
   */
  notificationType?: NotificationType;
  /** What the push is about, recorded on its log row. Omitted, it is a system push. */
  kind?: PushNotificationKind;
}

interface SendResult {
  success: boolean;
  error?: string;
  subscriptionRemoved?: boolean;
}

/**
 * Sends one push to one device right away, and writes its log row when a `userId` is given.
 *
 * For the sends someone waits on: the confirmation after subscribing and the test send from
 * the admin panel. Nothing retries them, so a push service that asks to come back later
 * counts as a failure here. Pushes to many people go through `@/lib/push/send-notification`.
 *
 * Every send is a `push.send` span and a `push_sends_total` sample.
 */
export async function sendNotificationToSubscription(
  subscription: PushDevice,
  message: string,
  url?: string,
  userId?: string,
  existingLogId?: string,
  logContent?: string,
  options?: SendOptions,
): Promise<SendResult> {
  const channel = channelOf(subscription);
  const kind = options?.kind ?? PushNotificationKind.SYSTEM;

  return withSpan(
    'push.send',
    async (span) => {
      const text = composePushText({
        title: options?.title ?? (await getAppShortName()),
        body: message,
      });
      const { default: prisma } = await import('@/lib/db/prisma');

      let logId = existingLogId;
      if (userId !== undefined && userId !== '' && logId === undefined) {
        try {
          const log = await prisma.pushNotificationLog.create({
            data: { userId, content: logContent ?? text.body, status: 'PENDING', channel, kind },
          });
          logId = log.id;
        } catch (error) {
          // The push still goes out, it only leaves no trace in the history.
          logger.error('Failed to create push notification log', { error, 'user.id': userId });
        }
      }

      const startedAt = performance.now();
      const result = await sendPushToDevice(
        subscription,
        {
          ...text,
          url,
          messageId: options?.messageId,
          notificationType: options?.notificationType,
          ignoreIfAppOpen: options?.ignoreIfAppOpen,
          ignoreIfUrlMatches: options?.ignoreIfUrlMatches,
        },
        { logId, timeToLiveSeconds: PUSH_TIME_TO_LIVE_SECONDS[kind], urgent: isUrgentKind(kind) },
      );
      const outcome = result.outcome === 'retry' ? 'failed' : result.outcome;
      recordPushSend(channel, kind, outcome, (performance.now() - startedAt) / 1000);
      span.setAttribute('push.outcome', outcome);

      if (outcome === 'accepted') {
        // Accepted is not delivered: only the device can say that it received the push, see
        // `pushTrackingRouter.markDelivered`. A fast device can report back before this line
        // runs, so the update must not overwrite its DELIVERED.
        if (logId !== undefined) {
          await prisma.pushNotificationLog.updateMany({
            where: { id: logId, status: 'PENDING' },
            data: { status: 'SENT' },
          });
        }
        return { success: true };
      }

      const error = result.error ?? 'Unknown error';
      if (logId !== undefined) {
        await prisma.pushNotificationLog.update({
          where: { id: logId },
          data: { status: 'FAILED', error },
        });
      }

      const logAttributes = {
        'push.channel': channel,
        'push.log_id': logId,
        'push.fcm_error_code': result.fcmErrorCode,
        'http.response.status_code': result.statusCode,
        'push.response_body': result.responseBody,
        'server.address':
          'endpoint' in subscription ? endpointHostOf(subscription.endpoint) : undefined,
        'user.id': userId,
        error: result.cause ?? error,
      };

      // A device that unsubscribed is the normal end of a subscription, not a fault, and it
      // is pruned below so it fires once per device. Anything else is worth a look.
      if (outcome === 'failed') {
        span.setStatus({ code: SpanStatusCode.ERROR, message: error });
        logger.error('Sending push notification failed', logAttributes);
        return { success: false, error };
      }

      logger.info('Pruning expired push subscription', logAttributes);
      const pruned = await pruneSubscription(subscription).catch((pruneError: unknown) => {
        logger.warn('Failed to prune expired push subscription', {
          ...logAttributes,
          error: pruneError,
        });
        return false;
      });
      return pruned
        ? { success: false, error, subscriptionRemoved: true }
        : { success: false, error };
    },
    { 'push.channel': channel, 'push.kind': kind },
  );
}

/** Deletes the stored subscription of a device that unsubscribed. */
async function pruneSubscription(subscription: PushDevice): Promise<boolean> {
  const payload = await getPayload({ config });
  let where: Where | undefined;
  if (
    'endpoint' in subscription &&
    typeof subscription.endpoint === 'string' &&
    subscription.endpoint !== ''
  ) {
    where = { endpoint: { equals: subscription.endpoint } };
  } else if (
    'token' in subscription &&
    typeof subscription.token === 'string' &&
    subscription.token !== ''
  ) {
    where = { token: { equals: subscription.token } };
  } else if (
    'id' in subscription &&
    typeof subscription.id === 'string' &&
    subscription.id !== ''
  ) {
    where = { id: { equals: subscription.id } };
  }
  if (where === undefined) return false;
  await payload.delete({ collection: 'push-notification-subscriptions', where });
  return true;
}
