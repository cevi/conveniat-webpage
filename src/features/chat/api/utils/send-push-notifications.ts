import { environmentVariables } from '@/config/environment-variables';
import type { PushNotificationSubscription } from '@/features/payload-cms/payload-types';
import config from '@payload-config';
import { getPayload } from 'payload';

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
 * @returns the number of subscriptions whose send threw
 */
async function dispatchBounded(
  subscriptions: PushNotificationSubscription[],
  send: (subscription: PushNotificationSubscription) => Promise<unknown>,
): Promise<number> {
  let nextIndex = 0;
  let failures = 0;

  const worker = async (): Promise<void> => {
    while (nextIndex < subscriptions.length) {
      const subscription = subscriptions[nextIndex];
      nextIndex++;
      if (subscription === undefined) continue;
      try {
        await send(subscription);
      } catch (error) {
        // One unreachable device must not cut the fan-out short for everyone
        // queued behind it.
        failures++;
        console.error('[Push] Sending to a subscription failed:', error);
      }
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(PUSH_FANOUT_CONCURRENCY, subscriptions.length) }, () => worker()),
  );

  return failures;
}

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
    console.warn(
      `[Push] Large fan-out: ${subscriptions.length} subscriptions for ${recipientUserIds.length} recipients`,
    );
  }

  return subscriptions;
}

async function processSubscription(
  subscription: PushNotificationSubscription,
  message: string,
  chatURL: string,
  messageId?: string,
  chatId?: string,
  options?: {
    chatName?: string;
    senderName?: string;
    title?: string;
    /** Routes the push to the native siren channel/sound. See issue #47. */
    notificationType?: 'emergency';
  },
): Promise<{ success: boolean; error?: string }> {
  const { sendNotificationToSubscription } = await import('@/utils/push-notification-api');

  const userId =
    typeof subscription.user === 'object'
      ? subscription.user?.id
      : (subscription.user ?? undefined);

  // Use chatName/title for push notification title if available
  const notificationTitle = options?.chatName ?? options?.title;

  // Format body as "SenderName: Message" if senderName is provided
  const notificationBody = options?.senderName ? `${options.senderName}: ${message}` : message;

  // For chat messages, we log a JSON object instead of the actual message content for privacy
  const logContent =
    messageId !== undefined && chatId !== undefined
      ? JSON.stringify({
          type: 'chat_message',
          messageId,
          chatId,
        })
      : undefined;

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
      ...(options?.notificationType === undefined
        ? {}
        : { notificationType: options.notificationType }),
    },
  );
}

/**
 * Sends a push notification to the user.
 * This function remains largely the same, but it's now a utility within the tRPC context.
 * @param message - The message content to send in the notification.
 * @param recipientUserIds - An array of user IDs to whom the notification should be sent.
 * @param chatId - The ID of the chat, used to construct the deep link URL.
 * @param messageId - Optional ID of the message for logging purposes.
 * @param options - Optional formatting configuration (chatName, senderName, title).
 */
export async function sendNotification(
  message: string,
  recipientUserIds: string[],
  chatId: string,
  messageId?: string,
  options?: {
    chatName?: string;
    senderName?: string;
    title?: string;
    /** Routes the push to the native siren channel/sound. See issue #47. */
    notificationType?: 'emergency';
  },
): Promise<{ success: boolean; error?: string }> {
  const subscriptions = await getSubscriptions(recipientUserIds);

  if (subscriptions.length === 0) {
    return {
      success: true,
      error: 'No push notification subscriptions found.',
    };
  }

  const chatURL = environmentVariables.APP_HOST_URL + '/app/chat/' + chatId;

  console.log(`Sending notification to ${subscriptions.length} subscriptions`);

  try {
    const failures = await dispatchBounded(subscriptions, (subscription) =>
      processSubscription(subscription, message, chatURL, messageId, chatId, options),
    );

    if (failures > 0) {
      console.error(`[Push] ${failures} of ${subscriptions.length} subscriptions failed to send`);
      return { success: false, error: 'Failed to send notification' };
    }

    console.log('Push notifications sent successfully');
    return { success: true };
  } catch (error) {
    console.error('Error sending push notification:', error);
    return { success: false, error: 'Failed to send notification' };
  }
}
