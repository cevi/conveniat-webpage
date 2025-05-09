'use server';

import type { SendMessage } from '@/features/chat/types/chat';
import { sendNotificationToSubscription } from '@/features/onboarding/api/push-notification';
import { PrismaClient } from '@/lib/prisma';
import type { HitobitoNextAuthUser } from '@/types/hitobito-next-auth-user';
import { auth } from '@/utils/auth-helpers';
import config from '@payload-config';
import { getPayload } from 'payload';
import type webpush from 'web-push';

const prisma = new PrismaClient();

/**
 * Sends a push notification to the user.
 * @param message
 */
async function sendNotification(message: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const payload = await getPayload({ config });

  const { totalDocs } = await payload.count({ collection: 'push-notification-subscriptions' });
  if (totalDocs === 0) {
    throw new Error('No subscription available');
  }

  const { docs: subscriptions } = await payload.find({
    collection: 'push-notification-subscriptions',
    depth: 0,
  });

  console.log(`Sending notification to ${subscriptions.length} subscriptions`);

  try {
    const webPushPromises = subscriptions.map((subscription) => {
      return sendNotificationToSubscription(
        subscription as webpush.PushSubscription,
        message,
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

export const sendMessage = async (message: SendMessage): Promise<void> => {
  const session = await auth();
  const user = session?.user as unknown as HitobitoNextAuthUser | undefined;
  if (user === undefined) {
    throw new Error('User not authenticated');
  }

  await prisma.message.create({
    data: {
      content: message.content,
      sender: {
        connect: {
          ceviDbID: user.cevi_db_uuid.toString(),
        },
      },
      chat: {
        connect: {
          uuid: message.chatId,
        },
      },
    },
  });

  // TODO: send push notification to all users in the chat
  sendNotification(message.content).catch(() => {
    console.error('Error sending notification:');
  });
};
