import type { NotificationType } from '@/lib/notification-type';
import { PushNotificationKind } from '@/lib/prisma';
import { recordPushSend } from '@/lib/push-metrics';
import { isUrgentKind, PUSH_TIME_TO_LIVE_SECONDS } from '@/lib/push/push-delivery-policy';
import type { PushDevice } from '@/lib/push/push-transport';
import { channelOf, composePushText, sendPushToDevice } from '@/lib/push/push-transport';
import { getAppShortName } from '@/utils/get-app-short-name';
import { createLogger } from '@/utils/server-logger';
import { withSpan } from '@/utils/tracing-helpers';
import { SpanStatusCode } from '@opentelemetry/api';
import config from '@payload-config';
import type { Where } from 'payload';
import { getPayload } from 'payload';

const logger = createLogger('push:api');

const endpointHostOf = (endpoint: unknown): string | undefined => {
  if (typeof endpoint !== 'string') return undefined;
  try {
    return new URL(endpoint).host;
  } catch {
    return undefined;
  }
};

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
 *
 * It checks nothing about its caller, so it must not move into a `'use server'` file: every
 * export of one is an endpoint, and this one pushes any text to any device it is handed.
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
