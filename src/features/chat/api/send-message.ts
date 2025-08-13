'use server';

import { environmentVariables } from '@/config/environment-variables';
import prisma from '@/features/chat/database';
import type { SendMessageDto } from '@/features/chat/types/api-dto-types';
// eslint-disable-next-line import/no-restricted-paths
import { sendNotificationToSubscription } from '@/features/onboarding/api/push-notification';
import { ChatMembershipPermission, MessageEventType } from '@/lib/prisma';
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
  timestamp: z.preprocess(
    (argument) => {
      if (argument instanceof Date) {
        if (argument > new Date()) return new Date();
        return argument;
      }

      if (typeof argument === 'string' || typeof argument === 'number') {
        const date = new Date(argument);
        if (!Number.isNaN(date.getTime()) && date > new Date()) return new Date();
        return date;
      }

      // If it's neither a Date, string, nor number, return it as is.
      // z.date() will then handle the final validation
      // (e.g., throwing an error if it's not a valid date).
      return argument;
    },
    z.date({
      invalid_type_error: 'Timestamp must be a valid date.',
    }),
  ),
});

/**
 * Sends a push notification to the user.
 * @param message
 * @param recipientUserIds
 */
async function sendNotification(
  message: string,
  recipientUserIds: string[],
  chatId: string,
): Promise<{
  success: boolean;
  error?: string;
}> {
  const payload = await getPayload({ config });

  const { totalDocs } = await payload.count({ collection: 'push-notification-subscriptions' });
  if (totalDocs === 0) {
    // abort early if there are no subscriptions
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
    const webPushPromises = subscriptions.map((subscription) => {
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

// eslint-disable-next-line complexity
export const sendMessage = async (message: SendMessageDto): Promise<void> => {
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

    const userMembership = chat.chatMemberships.find(
      (membership) => membership.userId === user.uuid,
    );
    if (!userMembership || userMembership.chatPermission === ChatMembershipPermission.GUEST) {
      console.warn(
        `User ${user.uuid} does not have permission to send messages in chat ${validatedMessage.chatId}. The user has permission: ${userMembership?.chatPermission}.`,
      );

      throw new Error('You do not have permission to send messages in this chat.');
    }

    console.log(
      `Push notification for chat ${validatedMessage.chatId} is sent to ${user.uuid} ${JSON.stringify(
        chat.chatMemberships,
      )}`,
    );
    const recipientUserIds = chat.chatMemberships
      .filter((membership) => membership.userId !== user.uuid)
      .map((membership) => membership.userId);

    const createdMessage = await prisma.message.create({
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
        messageEvents: {
          create: [
            {
              eventType: MessageEventType.CREATED,
              timestamp: validatedMessage.timestamp,
              userId: user.uuid,
            },
            {
              eventType: MessageEventType.SERVER_RECEIVED,
              timestamp: new Date(),
            },
          ],
        },
      },
    });

    // TODO: set change lastUpdate of chat (this should be a transaction with the above)
    await prisma.chat.update({
      where: {
        uuid: validatedMessage.chatId,
      },
      data: {
        lastUpdate: new Date(),
      },
    });

    console.log(`Message created with ID: ${createdMessage.uuid}`);

    // 4. Send push notification (fire-and-forget, but with better error logging)
    sendNotification(validatedMessage.content, recipientUserIds, validatedMessage.chatId)
      .then(async () => {
        await prisma.messageEvent.createMany({
          data: recipientUserIds.map((userId) => ({
            userId: userId,
            messageId: createdMessage.uuid,
            eventType: MessageEventType.SERVER_SENT,
            timestamp: new Date(),
          })),
        });
      })
      .catch((error: unknown) => {
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
