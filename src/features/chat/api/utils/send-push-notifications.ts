import { environmentVariables } from '@/config/environment-variables';
import config from '@payload-config';
import { getPayload } from 'payload';
import type webpush from 'web-push';

/**
 * Sends a push notification to the user.
 * This function remains largely the same, but it's now a utility within the tRPC context.
 * @param message - The message content to send in the notification.
 * @param recipientUserIds - An array of user IDs to whom the notification should be sent.
 * @param chatId - The ID of the chat, used to construct the deep link URL.
 */
export async function sendNotification(
  message: string,
  recipientUserIds: string[],
  chatId: string,
): Promise<{ success: boolean; error?: string }> {
  const payload = await getPayload({ config });

  const { totalDocs } = await payload.count({ collection: 'push-notification-subscriptions' });
  if (totalDocs === 0) {
    return {
      success: true,
      error: 'No push notification subscriptions found.',
    };
  }

  const { docs: subscriptions } = await payload.find({
    collection: 'push-notification-subscriptions',
    where: {
      user: {
        in: recipientUserIds,
      },
    },
    depth: 0,
  });

  const chatURL = environmentVariables.APP_HOST_URL + '/app/chat/' + chatId;

  console.log(`Sending notification to ${subscriptions.length} subscriptions`);

  try {
    const webPushPromises = subscriptions.map(async (subscription) => {
      const { sendNotificationToSubscription } = await import('@/utils/push-notification-api');

      return sendNotificationToSubscription(
        subscription as webpush.PushSubscription,
        message,
        chatURL,
      ).catch((error: unknown) => {
        console.error(`Error sending notification to subscription ${subscription.id}:`, error);
        throw new Error(`Failed to send notification to subscription ${subscription.id}`);
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
