'use server';

import prisma from '@/features/chat/database';
import type { SendMessage } from '@/features/chat/types/chat';
import { sendNotificationToSubscription } from '@/features/onboarding/api/push-notification';
import type { HitobitoNextAuthUser } from '@/types/hitobito-next-auth-user';
import { auth } from '@/utils/auth-helpers';
import config from '@payload-config';
import { getPayload } from 'payload';
import type webpush from 'web-push';
import { z } from 'zod';

const sendMessageSchema = z.object({
  chatId: z.string().uuid('Invalid chat ID format.'),
  content: z
    .string()
    .min(1, 'Message content cannot be empty.')
    .max(2000, 'Message content is too long.'),
});

/**
 * Sends a push notification to the user.
 * @param message
 */
async function sendNotification(
  message: string,
  recipientUserIds: string[],
): Promise<{
  success: boolean;
  error?: string;
}> {
  const payload = await getPayload({ config });

  const { totalDocs } = await payload.count({ collection: 'push-notification-subscriptions' });
  if (totalDocs === 0) {
    throw new Error('No subscription available');
  }

  console.log(recipientUserIds);

  const { docs: subscriptions } = await payload.find({
    collection: 'push-notification-subscriptions',
    where: {
      user: {
        in: recipientUserIds,
      },
    },
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

  const validationResult = sendMessageSchema.safeParse(message);

  if (!validationResult.success) {
    console.error('Input validation failed:', validationResult.error.errors);
    throw new Error('Invalid message data.');
  }

  const validatedMessage = validationResult.data;

  // 2. Validate that the user is part of the chat
  try {
    const chat = await prisma.chat.findUnique({
      where: {
        uuid: validatedMessage.chatId,
      },
      select: {
        chatMemberships: true,
      },
    });
    console.log(chat);

    if (
      !chat ||
      chat.chatMemberships.length === 0 ||
      !chat.chatMemberships.some((membership) => membership.userId === user.uuid)
    ) {
      console.warn(
        `User ${user.uuid} attempted to send message to chat ${validatedMessage.chatId} they are not a member of.`,
      );
      throw new Error('You are not a member of this chat.');
    }

    console.log(
      `Push notification for chat ${validatedMessage.chatId} is sent to ${user.uuid} ${JSON.stringify(
        chat.chatMemberships,
      )}`,
    );
    const recipientUserIds = chat.chatMemberships
      .filter((membership) => membership.userId !== user.uuid)
      .map((membership) => membership.userId);

    await prisma.message.create({
      data: {
        content: validatedMessage.content,
        sender: {
          connect: {
            uuid: user.uuid,
          },
        },
        chat: {
          connect: {
            uuid: validatedMessage.chatId,
          },
        },
      },
    });

    // 4. Send push notification (fire-and-forget, but with better error logging)
    sendNotification(validatedMessage.content, recipientUserIds).catch((error: unknown) => {
      console.error(`Error sending notification for chat ${validatedMessage.chatId}:`, error);
    });
  } catch (error) {
    console.error('Error sending message:', error);
    throw error instanceof Error &&
      (error.message === 'You are not a member of this chat.' ||
        error.message === 'Invalid message data.')
      ? error
      : new Error('Failed to send message.');
  }
};
