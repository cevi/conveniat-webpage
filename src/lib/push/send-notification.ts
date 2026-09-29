import { environmentVariables } from '@/config/environment-variables';
import type { PushNotificationSubscription } from '@/features/payload-cms/payload-types';
import type { NotificationType } from '@/lib/notification-type';
import { PushNotificationKind } from '@/lib/prisma';
import { PUSH_TIME_TO_LIVE_SECONDS } from '@/lib/push/push-delivery-policy';
import { enqueuePushNotification } from '@/lib/push/push-queue';
import { composePushText, sendPushToDevice } from '@/lib/push/push-transport';
import { getAppShortName } from '@/utils/get-app-short-name';
import { announcementNotificationTag } from '@/utils/notification-tags';
import { createLogger } from '@/utils/server-logger';
import config from '@payload-config';
import { getPayload } from 'payload';

const logger = createLogger('push:fanout');

interface SendNotificationOptions {
  /** What the push is about; recorded on every log row, span and metric of the send. */
  kind: PushNotificationKind;
  chatName?: string;
  senderName?: string;
  title?: string;
  notificationType?: NotificationType;
}

/**
 * Pushes a chat message to every device of the given people, through the delivery queue.
 *
 * Resolves once the deliveries are stored. The sends follow right away on this replica, and a
 * delivery that fails for the moment is retried, see `@/lib/push/push-queue`.
 *
 * @param message - The message content to send in the notification.
 * @param recipientUserIds - The people to notify.
 * @param chatId - The ID of the chat, used to construct the deep link URL.
 * @param messageId - The chat message, so the client can drop the push when the same message
 *   already arrived over the realtime stream.
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
  try {
    const { deliveries } = await enqueuePushNotification({
      kind: options.kind,
      recipientUserIds,
      title: options.chatName ?? options.title ?? (await getAppShortName()),
      body:
        options.senderName === undefined || options.senderName === ''
          ? message
          : `${options.senderName}: ${message}`,
      url: environmentVariables.APP_HOST_URL + '/app/chat/' + chatId,
      chatId,
      messageId,
      notificationType: options.notificationType,
      ignoreIfUrlMatches: true,
      // A chat push logs where the message is instead of its text, so the admin panel's push
      // history does not become a second copy of everybody's chats.
      logContent:
        messageId === undefined
          ? undefined
          : JSON.stringify({ type: 'chat_message', messageId, chatId }),
    });
    return deliveries === 0
      ? { success: true, error: 'No push notification subscriptions found.' }
      : { success: true };
  } catch (error: unknown) {
    logger.error('Queuing the push failed', {
      error,
      'push.kind': options.kind,
      'chat.id': chatId,
      'message.id': messageId,
    });
    return { success: false, error: 'Failed to send notification' };
  }
}

/** How many quiet updates go out at once. */
const UPDATE_CONCURRENCY = 20;

/**
 * Whether a subscription can take an update that may end up showing nothing.
 *
 * The native shells render FCM notifications themselves and cannot update one quietly, so an
 * update would arrive as a second alert. Safari revokes a Web Push subscription whose pushes
 * do not show a notification, which is exactly what an update for a dismissed notification
 * does.
 */
const canUpdateQuietly = (subscription: PushNotificationSubscription): boolean => {
  if (subscription.platform !== 'web' || typeof subscription.endpoint !== 'string') return false;
  try {
    return !new URL(subscription.endpoint).host.endsWith('push.apple.com');
  } catch {
    return false;
  }
};

/**
 * Puts the edited text of an announcement into the notification its readers still have on
 * screen, without a sound. A reader who dismissed it gets nothing, and neither do devices that
 * cannot update quietly, see {@link canUpdateQuietly}.
 *
 * Sent directly rather than through the queue: the update is not a notification of its own, it
 * writes no log row, and one that does not arrive leaves the original text on screen.
 */
export async function updateAnnouncementNotification(
  message: string,
  recipientUserIds: string[],
  chatId: string,
  messageId: string,
): Promise<void> {
  const payload = await getPayload({ config });
  const { docs } = await payload.find({
    collection: 'push-notification-subscriptions',
    where: { user: { in: recipientUserIds } },
    // No `limit`, see enqueuePushNotification: a limit binds even with pagination off.
    pagination: false,
    depth: 0,
  });
  const subscriptions = docs.filter((subscription) => canUpdateQuietly(subscription));
  if (subscriptions.length === 0) return;

  const text = composePushText({ title: await getAppShortName(), body: message });
  const pushMessage = {
    ...text,
    url: environmentVariables.APP_HOST_URL + '/app/chat/' + chatId,
    tag: announcementNotificationTag(messageId),
    replaceOnly: true,
  };
  const options = {
    timeToLiveSeconds: PUSH_TIME_TO_LIVE_SECONDS[PushNotificationKind.ANNOUNCEMENT],
    urgent: false,
  };

  let failed = 0;
  for (let start = 0; start < subscriptions.length; start += UPDATE_CONCURRENCY) {
    const batch = subscriptions.slice(start, start + UPDATE_CONCURRENCY);
    const results = await Promise.all(
      batch.map((subscription) => sendPushToDevice(subscription, pushMessage, options)),
    );
    failed += results.filter((result) => result.outcome !== 'accepted').length;
  }

  logger.debug('Announcement notification update finished', {
    'push.subscriptions': subscriptions.length,
    'push.failed': failed,
    'chat.id': chatId,
    'message.id': messageId,
  });
}
