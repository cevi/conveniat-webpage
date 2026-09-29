import { environmentVariables } from '@/config/environment-variables';
import type { PushNotificationSubscription } from '@/features/payload-cms/payload-types';
import type { NotificationType } from '@/lib/notification-type';
import { PushNotificationKind } from '@/lib/prisma';
import { recordPushRecipients } from '@/lib/push-metrics';
import { createLogger } from '@/utils/server-logger';
import { withSpan } from '@/utils/tracing-helpers';
import config from '@payload-config';
import { getPayload } from 'payload';

/**
 * `console.log` is not bridged into Loki - only `error` and `warn` are, see
 * `@/utils/otel-console-bridge` - so everything this module knew about a send was
 * invisible in Grafana unless it failed. How many devices a message actually fanned
 * out to, and how many of those the push service rejected, are the two numbers you
 * want when a chat "does not notify anyone", and neither could be answered.
 */
const logger = createLogger('push:fanout');

interface FanoutOutcome {
  /** Sends that threw, i.e. never reached a verdict. */
  thrown: number;
  /** Sends the push service turned away because the device had unsubscribed. */
  expired: number;
  /** Sends that completed but failed for any other reason. */
  failed: number;
}

interface SendOutcome {
  success: boolean;
  subscriptionRemoved?: boolean;
}

/**
 * Kinds whose fan-out is logged at info even when it went well. They are rare, and when
 * someone asks whether the piket was woken up, the answer must not depend on trace
 * sampling. A chat message fires per request, so its summary stays at debug and
 * `push_sends_total` counts it instead.
 */
const KINDS_ALWAYS_LOGGED = new Set<PushNotificationKind>([
  PushNotificationKind.EMERGENCY,
  PushNotificationKind.SUPPORT,
  PushNotificationKind.ANNOUNCEMENT,
]);

/**
 * Fan-out size that is worth a log line. Every subscription above this is another
 * parallel FCM call further down, so a sudden jump is the first hint that a send is
 * about to be expensive.
 */
const LARGE_FANOUT_WARNING_THRESHOLD = 500;

/**
 * Upper bound on sends in flight at once. Every send holds a prisma connection for
 * its log row plus an outbound FCM / web-push request, and the recipient lookup is
 * deliberately uncapped, so a camp-wide chat would otherwise start a thousand of
 * them in the same tick and exhaust the connection pool - sends then fail on pool
 * acquisition rather than on anything push-related. The ceiling has to live here.
 */
const PUSH_FANOUT_CONCURRENCY = 25;

/**
 * Runs `send` over every subscription with at most {@link PUSH_FANOUT_CONCURRENCY}
 * in flight.
 *
 * @returns how the fan-out ended, see {@link FanoutOutcome}
 */
async function dispatchBounded(
  subscriptions: PushNotificationSubscription[],
  send: (subscription: PushNotificationSubscription) => Promise<SendOutcome>,
): Promise<FanoutOutcome> {
  let nextIndex = 0;
  let thrown = 0;
  let expired = 0;
  let failed = 0;

  const worker = async (): Promise<void> => {
    while (nextIndex < subscriptions.length) {
      const subscription = subscriptions[nextIndex];
      nextIndex++;
      if (subscription === undefined) continue;
      try {
        const result = await send(subscription);
        if (result.subscriptionRemoved === true) expired++;
        else if (!result.success) failed++;
      } catch (error) {
        // One unreachable device must not cut the fan-out short for everyone
        // queued behind it.
        thrown++;
        logger.error('Sending to a subscription failed', { error });
      }
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(PUSH_FANOUT_CONCURRENCY, subscriptions.length) }, () => worker()),
  );

  return { thrown, expired, failed };
}

const recipientIdOf = (subscription: PushNotificationSubscription): string | undefined =>
  typeof subscription.user === 'object' ? subscription.user?.id : (subscription.user ?? undefined);

async function getSubscriptions(
  recipientUserIds: string[],
): Promise<PushNotificationSubscription[]> {
  const payload = await getPayload({ config });

  const { totalDocs } = await payload.count({ collection: 'push-notification-subscriptions' });
  if (totalDocs === 0) return [];

  const { docs: subscriptions } = await payload.find({
    collection: 'push-notification-subscriptions',
    where: {
      user: {
        in: recipientUserIds,
      },
    },
    // No `limit`: an explicit limit binds even alongside `pagination: false`
    // (`sanitizedLimit = limit ?? (usePagination ? 10 : 0)` in payload's find
    // operation), so the previous `limit: 1000` silently truncated the recipient
    // list. Nobody past the cap received a notification, and nothing reported it.
    // A camp of a few hundred people with a phone and a browser each sits right at
    // that boundary, so the cap would have started dropping people mid-event.
    pagination: false,
    depth: 0,
  });

  if (subscriptions.length > LARGE_FANOUT_WARNING_THRESHOLD) {
    logger.warn('Large fan-out', {
      'push.subscriptions': subscriptions.length,
      'push.recipients': recipientUserIds.length,
    });
  }

  return subscriptions;
}

async function processSubscription(
  subscription: PushNotificationSubscription,
  message: string,
  chatURL: string,
  messageId: string | undefined,
  chatId: string,
  options: SendNotificationOptions,
): Promise<SendOutcome> {
  const { sendNotificationToSubscription } = await import('@/utils/push-notification-api');

  const userId = recipientIdOf(subscription);

  // Use chatName/title for push notification title if available
  const notificationTitle = options.chatName ?? options.title;

  // Format body as "SenderName: Message" if senderName is provided
  const notificationBody = options.senderName ? `${options.senderName}: ${message}` : message;

  // For chat messages, we log a JSON object instead of the actual message content for privacy
  const logContent =
    messageId === undefined
      ? undefined
      : JSON.stringify({
          type: 'chat_message',
          messageId,
          chatId,
        });

  // We delegate logging to sendNotificationToSubscription by passing userId
  return sendNotificationToSubscription(
    subscription,
    notificationBody,
    chatURL,
    userId,
    undefined, // existingLogId
    logContent,
    {
      ignoreIfUrlMatches: true,
      // Lets the client de-duplicate the same message arriving over both the
      // push channel and the realtime (SSE) stream.
      ...(messageId === undefined ? {} : { messageId }),
      ...(typeof notificationTitle === 'string' ? { title: notificationTitle } : {}),
      ...(options.notificationType === undefined
        ? {}
        : { notificationType: options.notificationType }),
      kind: options.kind,
    },
  );
}

interface SendNotificationOptions {
  /** What the push is about; recorded on every log row, span and metric of the send. */
  kind: PushNotificationKind;
  chatName?: string;
  senderName?: string;
  title?: string;
  notificationType?: NotificationType;
}

/**
 * Sends a push notification to every device of the given people.
 *
 * The whole fan-out is one `push.fanout` span, with a `push.send` span per device below it,
 * and ends in one summary log line; see {@link KINDS_ALWAYS_LOGGED} for its level.
 *
 * @param message - The message content to send in the notification.
 * @param recipientUserIds - An array of user IDs to whom the notification should be sent.
 * @param chatId - The ID of the chat, used to construct the deep link URL.
 * @param messageId - Optional ID of the message for logging purposes.
 * @param options - What the push is about, optional formatting (chatName, senderName,
 *   title), and the notification type, which decides whether native clients present the
 *   push on the regular chat channel or on the emergency channel with its siren.
 */
export async function sendNotification(
  message: string,
  recipientUserIds: string[],
  chatId: string,
  messageId: string | undefined,
  options: SendNotificationOptions,
): Promise<{ success: boolean; error?: string }> {
  return withSpan(
    'push.fanout',
    async (span) => {
      const subscriptions = await getSubscriptions(recipientUserIds);

      const recipients = new Set(recipientUserIds);
      const recipientsWithDevice = new Set(
        subscriptions.map((subscription) => recipientIdOf(subscription)),
      );
      const withoutDevice = [...recipients].filter((id) => !recipientsWithDevice.has(id)).length;
      recordPushRecipients(options.kind, recipients.size - withoutDevice, withoutDevice);

      const summary = {
        'push.kind': options.kind,
        'push.recipients': recipients.size,
        'push.recipients_without_device': withoutDevice,
        'push.subscriptions': subscriptions.length,
        'chat.id': chatId,
        'message.id': messageId,
      };
      span.setAttributes(summary);

      if (subscriptions.length === 0) {
        if (KINDS_ALWAYS_LOGGED.has(options.kind)) {
          logger.info('Push fan-out reached no device', summary);
        } else {
          logger.debug('Push fan-out reached no device', summary);
        }
        return { success: true, error: 'No push notification subscriptions found.' };
      }

      const chatURL = environmentVariables.APP_HOST_URL + '/app/chat/' + chatId;

      try {
        const { thrown, expired, failed } = await dispatchBounded(subscriptions, (subscription) =>
          processSubscription(subscription, message, chatURL, messageId, chatId, options),
        );

        // One line per send, carrying the whole shape of the fan-out. `expired` is the
        // normal end of a subscription; `accepted` is the number that says whether the
        // chat notified anybody.
        const outcome = {
          ...summary,
          'push.accepted': subscriptions.length - thrown - expired - failed,
          'push.expired': expired,
          'push.failed': failed,
          'push.thrown': thrown,
        };
        span.setAttributes(outcome);

        if (thrown > 0) {
          logger.error('Push fan-out finished with failed sends', outcome);
          return { success: false, error: 'Failed to send notification' };
        }

        if (KINDS_ALWAYS_LOGGED.has(options.kind) || failed > 0 || outcome['push.accepted'] === 0) {
          logger.info('Push fan-out finished', outcome);
        } else {
          logger.debug('Push fan-out finished', outcome);
        }
        return { success: true };
      } catch (error) {
        logger.error('Push fan-out aborted', { error, ...summary });
        return { success: false, error: 'Failed to send notification' };
      }
    },
    { 'push.kind': options.kind, 'chat.id': chatId },
  );
}
