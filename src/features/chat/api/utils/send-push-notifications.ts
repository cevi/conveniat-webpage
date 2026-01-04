import { environmentVariables } from '@/config/environment-variables';
import type { PushNotificationSubscription } from '@/features/payload-cms/payload-types';
import config from '@payload-config';
import { getPayload } from 'payload';
import type webpush from 'web-push';

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
    depth: 0,
  });

  return subscriptions;
}

async function processSubscription(
  subscription: webpush.PushSubscription & { user?: string | { id: string } },
  message: string,
  chatURL: string,
  messageId?: string,
  chatId?: string,
): Promise<{ success: boolean; error?: string }> {
  const { sendNotificationToSubscription } = await import('@/utils/push-notification-api');

  const userId = typeof subscription.user === 'object' ? subscription.user.id : subscription.user;

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
    subscription as webpush.PushSubscription,
    message,
    chatURL,
    userId,
    undefined, // existingLogId
    logContent,
  );
}

/**
 * Sends a push notification to the user.
 * This function remains largely the same, but it's now a utility within the tRPC context.
 * @param message - The message content to send in the notification.
 * @param recipientUserIds - An array of user IDs to whom the notification should be sent.
 * @param chatId - The ID of the chat, used to construct the deep link URL.
 * @param messageId - Optional ID of the message for logging purposes.
 */
export async function sendNotification(
  message: string,
  recipientUserIds: string[],
  chatId: string,
  messageId?: string,
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
    const webPushPromises = subscriptions.map((subscription) =>
      processSubscription(
        subscription as webpush.PushSubscription & { user?: string | { id: string } },
        message,
        chatURL,
        messageId,
        chatId,
      ),
    );
    await Promise.all(webPushPromises);

    console.log('Push notifications sent successfully');
    return { success: true };
  } catch (error) {
    console.error('Error sending push notification:', error);
    return { success: false, error: 'Failed to send notification' };
  }
}
