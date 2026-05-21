import { getActivePiketMembers } from '@/features/chat/api/utils/piket-service';
import { sendNotification } from '@/features/chat/api/utils/send-push-notifications';
import { ChatCapability } from '@/lib/chat-shared';
import { chatPubSub } from '@/lib/db/chat-pubsub';
import { ChatType, MessageEventType, MessageType } from '@/lib/prisma';
import { trpcBaseProcedure } from '@/trpc/init';
import { databaseTransactionWrapper } from '@/trpc/middleware/database-transaction-wrapper';
import type { StaticTranslationString } from '@/types/types';
import { z } from 'zod';

const systemMessageContent: StaticTranslationString = {
  en: 'Please describe the problem and attach photos (detail + wide angle).',
  de: 'Bitte beschreibe das Problem und füge Fotos hinzu (Detail- und Weitwinkelaufnahme).',
  fr: 'Veuillez décrire le problème et joindre des photos (détail et grand angle).',
};

export const reportProblem = trpcBaseProcedure
  .input(
    z
      .object({
        location: z.tuple([z.number(), z.number()]).optional(), // [lng, lat]
      })
      .optional(),
  )
  .use(databaseTransactionWrapper)
  .mutation(async ({ ctx, input }) => {
    const { user, prisma } = ctx;

    const chatName = `Problem Report - ${new Date().toLocaleDateString()} - ${user.name}`;

    // Fetch active support piket members
    const activePiketMembers = await getActivePiketMembers(
      ChatType.SUPPORT_GROUP,
      new Date(),
    ).catch((error: unknown) => {
      console.error('Failed to query active support piket members:', error);
      return [];
    });

    // Ensure all active piket members exist in Postgres User table
    for (const member of activePiketMembers) {
      await prisma.user.upsert({
        where: { uuid: member.id },
        create: {
          uuid: member.id,
          name: member.name,
          lastSeen: new Date('1970-01-01T00:00:00Z'),
        },
        update: {
          name: member.name,
        },
      });
    }

    // Create the support chat
    const chat = await prisma.chat.create({
      data: {
        name: chatName,
        type: ChatType.SUPPORT_GROUP,
        status: 'OPEN',
        description: 'User reported problem from map',
        chatMemberships: {
          create: [
            {
              userId: user.uuid,
              chatPermission: 'OWNER',
            },
            ...activePiketMembers.map((member) => ({
              userId: member.id,
              chatPermission: 'MEMBER' as const,
            })),
          ],
        },
        capabilities: [ChatCapability.PICTURE_UPLOAD, ChatCapability.CAN_SEND_MESSAGES],
      },
    });

    // Send push notification to all support piket members
    if (activePiketMembers.length > 0) {
      const piketRecipientIds = activePiketMembers.map((m) => m.id);

      let localizedAlertMessage = `New problem report from ${user.name}!`;
      if (ctx.locale === 'de') {
        localizedAlertMessage = `Neuer Problem-Bericht von ${user.name}!`;
      } else if (ctx.locale === 'fr') {
        localizedAlertMessage = `Nouveau rapport de problème de ${user.name}!`;
      }

      sendNotification(localizedAlertMessage, piketRecipientIds, chat.uuid).catch(
        (error: unknown) => {
          console.error('Failed to send support push notification to piket members:', error);
        },
      );
    }

    const payloadContent = {
      ...systemMessageContent,
      ...(input?.location
        ? {
            location: {
              longitude: input.location[0],
              latitude: input.location[1],
            },
          }
        : {}),
    };

    // 1. Create the initial system message
    const systemMessage = await prisma.message.create({
      data: {
        chatId: chat.uuid,
        type: MessageType.SYSTEM_MSG,
        contentVersions: {
          create: {
            payload: payloadContent,
          },
        },
        messageEvents: {
          create: {
            type: MessageEventType.CREATED,
          },
        },
      },
    });

    // Publish the initial system message real-time event to chatPubSub so that active admin streams display it instantly
    chatPubSub
      .publish({
        type: 'new_message',
        chatId: chat.uuid,
        senderId: user.uuid,
        message: {
          id: systemMessage.uuid,
          createdAt: systemMessage.createdAt,
          messagePayload: payloadContent,
          senderId: user.uuid,
          status: MessageEventType.STORED,
          type: MessageType.SYSTEM_MSG,
        },
      })
      .catch((error: unknown) => {
        console.error('Failed to publish real-time event for problem report:', error);
      });

    return chat;
  });
