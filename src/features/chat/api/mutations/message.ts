import { environmentVariables } from '@/config/environment-variables';
import { sendNotificationToSubscription } from '@/features/onboarding/api/push-notification';
import { ChatMembershipPermission, MessageEventType } from '@/lib/prisma';
import { trpcBaseProcedure } from '@/trpc/init';
import { databaseTransactionWrapper } from '@/trpc/middleware/database-transaction-wrapper';
import config from '@payload-config';
import { getPayload } from 'payload';
import type webpush from 'web-push';
import { z } from 'zod';

// Zod schema for input validation
const sendMessageInputSchema = z.object({
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
      return argument;
    },
    z.date({
      invalid_type_error: 'Timestamp must be a valid date.',
    }),
  ),
});

/**
 * Sends a push notification to the user.
 * This function remains largely the same, but it's now a utility within the tRPC context.
 * @param message - The message content to send in the notification.
 * @param recipientUserIds - An array of user IDs to whom the notification should be sent.
 * @param chatId - The ID of the chat, used to construct the deep link URL.
 */
async function sendNotification(
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

// tRPC router for chat-related mutations
export const sendMessage = trpcBaseProcedure
  .input(sendMessageInputSchema)
  .use(databaseTransactionWrapper) // use a DB transaction for this mutation
  .mutation(async ({ input, ctx }) => {
    const { user, prisma } = ctx; // Destructure user and prisma from the tRPC context
    const validatedMessage = input; // Input is already validated by Zod

    // 2. Validate that the user is part of the chat and has permission to send messages
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

    // Create the message and its initial events within a transaction
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

    await prisma.chat.update({
      where: {
        uuid: validatedMessage.chatId,
      },
      data: {
        lastUpdate: new Date(),
      },
    });

    console.log(`Message created with ID: ${createdMessage.uuid}`);

    // TODO: the following should be done asynchronously,
    //  so that the user does not have to wait for the push notification to be sent
    //  --> consider using a queue system

    // Send push notification (fire-and-forget, with error logging)
    await sendNotification(validatedMessage.content, recipientUserIds, validatedMessage.chatId);

    // Record SERVER_SENT event after a successful notification attempt
    await prisma.messageEvent.createMany({
      data: recipientUserIds.map((userId) => ({
        userId: userId,
        messageId: createdMessage.uuid,
        eventType: MessageEventType.SERVER_SENT,
        timestamp: new Date(),
      })),
    });
  });
