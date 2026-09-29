import { environmentVariables } from '@/config/environment-variables';
import type { NotificationType } from '@/lib/notification-type';
import type { PushNotificationKind } from '@/lib/prisma';
import { enqueuePushNotification } from '@/lib/push/push-queue';
import { getAppShortName } from '@/utils/get-app-short-name';
import { createLogger } from '@/utils/server-logger';

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
