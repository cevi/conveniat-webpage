import { chatError } from '@/features/chat/api/chat-errors';
import { getActivePiketMembers } from '@/features/chat/api/utils/piket-service';
import { ChatCapability, SYSTEM_SENDER_ID } from '@/lib/chat-shared';
import { chatPubSub } from '@/lib/db/chat-pubsub';
import { FORUM_TEXT_MAX_LENGTH, FORUM_TITLE_MAX_LENGTH } from '@/lib/forum-shared';
import { ChatType, MessageEventType, MessageType, PushNotificationKind } from '@/lib/prisma';
import { sendNotification } from '@/lib/push/send-notification';
import { trpcBaseProcedure } from '@/trpc/init';
import { databaseTransactionWrapper } from '@/trpc/middleware/database-transaction-wrapper';
import { rateLimit } from '@/trpc/middleware/rate-limit';
import type { StaticTranslationString } from '@/types/types';
import { createLogger } from '@/utils/server-logger';
import { z } from 'zod';

const logger = createLogger('chat:mutations');

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
        // written in the forum's composer, which sends a private report here; the map's old
        // button sent neither
        title: z.string().trim().min(1).max(FORUM_TITLE_MAX_LENGTH).optional(),
        text: z.string().trim().max(FORUM_TEXT_MAX_LENGTH).optional(),
      })
      .optional(),
  )
  .use(
    // Every report pages all active piket members.
    rateLimit({
      name: 'chat.reportProblem',
      limit: 3,
      windowMs: 10 * 60 * 1000,
      refuse: () => chatError('TOO_MANY_REQUESTS', 'tooManyReports'),
    }),
  )
  .use(databaseTransactionWrapper)
  .mutation(async ({ ctx, input }) => {
    const { user, prisma } = ctx;

    const title = input?.title;
    const reportText = [title, input?.text]
      .filter((part) => part !== undefined && part !== '')
      .join('\n\n');
    const chatName = title ?? `Problem Report - ${new Date().toLocaleDateString()} - ${user.name}`;

    // Fetch active support piket members
    const activePiketMembers = await getActivePiketMembers(
      ChatType.SUPPORT_GROUP,
      new Date(),
    ).catch((error: unknown) => {
      logger.error('Failed to query the active support piket members', { error });
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

    // Announce the new chat on the personal channels of everyone who was just
    // added (reporter + auto-added piket members) so their open chat overviews
    // show the chat instantly. Deferred until after the transaction commits so
    // the refetch it triggers cannot read the pre-membership state.
    ctx.afterTransactionCommit(() => {
      for (const memberId of [user.uuid, ...activePiketMembers.map((member) => member.id)]) {
        chatPubSub
          .publish(memberId, {
            type: 'new_chat',
            chatId: chat.uuid,
            senderId: user.uuid,
          })
          .catch((error: unknown) => {
            logger.error('Failed to publish the new_chat event for a problem report', {
              error,
              'chat.id': chat.uuid,
              'user.id': memberId,
            });
          });
      }
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

      if (title !== undefined) localizedAlertMessage = `${localizedAlertMessage} ${title}`;

      ctx.afterTransactionCommit(() => {
        sendNotification(localizedAlertMessage, piketRecipientIds, chat.uuid, undefined, {
          kind: PushNotificationKind.SUPPORT,
          chatName: chat.name,
        }).catch((error: unknown) => {
          logger.error('Failed to send the support push notification to the piket members', {
            error,
            'chat.id': chat.uuid,
          });
        });
      });
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

    // Publish the initial system message real-time event to chatPubSub so that active admin
    // streams display it instantly, once the chat and message are committed
    ctx.afterTransactionCommit(() => {
      chatPubSub
        .publish({
          type: 'new_message',
          chatId: chat.uuid,
          senderId: SYSTEM_SENDER_ID,
          message: {
            id: systemMessage.uuid,
            createdAt: systemMessage.createdAt,
            messagePayload: payloadContent,
            senderId: SYSTEM_SENDER_ID,
            status: MessageEventType.STORED,
            type: MessageType.SYSTEM_MSG,
          },
        })
        .catch((error: unknown) => {
          logger.error('Failed to publish the real-time event for a problem report', {
            error,
            'chat.id': chat.uuid,
            'message.id': systemMessage.uuid,
          });
        });
    });

    // What the reporter wrote in the composer, as their own first message after the prompt
    if (reportText !== '') {
      const reportMessage = await prisma.message.create({
        data: {
          chatId: chat.uuid,
          senderId: user.uuid,
          type: MessageType.TEXT_MSG,
          contentVersions: { create: { payload: { text: reportText } } },
          messageEvents: {
            create: [
              { type: MessageEventType.CREATED, user: { connect: { uuid: user.uuid } } },
              { type: MessageEventType.STORED },
            ],
          },
        },
      });
      ctx.afterTransactionCommit(() => {
        chatPubSub
          .publish({
            type: 'new_message',
            chatId: chat.uuid,
            senderId: user.uuid,
            message: {
              id: reportMessage.uuid,
              createdAt: reportMessage.createdAt,
              messagePayload: { text: reportText },
              senderId: user.uuid,
              senderName: user.name,
              status: MessageEventType.STORED,
              type: MessageType.TEXT_MSG,
            },
          })
          .catch((error: unknown) => {
            logger.error('Failed to publish the text of a problem report', {
              error,
              'chat.id': chat.uuid,
              'message.id': reportMessage.uuid,
            });
          });
      });
    }

    return chat;
  });
