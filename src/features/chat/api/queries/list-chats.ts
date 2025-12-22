/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { USER_RELEVANT_MESSAGE_EVENTS } from '@/features/chat/api/definitions';
import { getStatusFromMessageEvents } from '@/features/chat/api/utils/get-status-from-message-events';
import { resolveChatName } from '@/features/chat/api/utils/resolve-chat-name';
import type { ChatWithMessagePreview } from '@/features/chat/types/api-dto-types';
import { MessageEventType } from '@/lib/prisma';
import { trpcBaseProcedure } from '@/trpc/init';
import { databaseTransactionWrapper } from '@/trpc/middleware/database-transaction-wrapper';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

/**
 * Extracts a preview text from the last message's content versions.
 * Converts system messages and special messages to a text
 * representation for preview purposes.
 *
 * TODO: how do we handle localization here?
 *
 * @param lastMessage
 */
const getMessagePreviewText = (lastMessage: {
  contentVersions: { payload: unknown }[];
}): string => {
  const payload = lastMessage.contentVersions[0]?.payload;

  if (
    typeof payload === 'object' &&
    payload !== null &&
    'system_msg_type' in payload &&
    typeof payload.system_msg_type === 'string'
  ) {
    switch (payload.system_msg_type) {
      case 'emergency_alert': {
        return '🚨 Emergency Alert';
      }
      default: {
        return 'System message';
      }
    }
  }

  if (
    typeof payload === 'object' &&
    payload !== null &&
    'location' in payload &&
    typeof payload.location === 'object' &&
    payload.location !== null &&
    'latitude' in payload.location &&
    'longitude' in payload.location
  ) {
    return '📍 Location shared';
  }

  // Handle Alert Response and Alert Question with robust checks
  // Payload is typed as unknown (Prisma Json), so we cast to any to safe access properties
  const p = payload as any;

  if (p?.message && typeof p.message === 'string') {
    return p.message;
  }

  if (p?.question && typeof p.question === 'string') {
    return p.question;
  }

  if (typeof payload === 'string') {
    return payload;
  }

  // Fallback for other message types
  return JSON.stringify(payload ?? {});
};

export const listChats = trpcBaseProcedure
  .input(z.object({}))
  .use(databaseTransactionWrapper)
  .query(async ({ ctx }): Promise<ChatWithMessagePreview[]> => {
    const { user, prisma } = ctx;

    const prismaUser = await prisma.user.findUnique({
      where: { uuid: user.uuid },
    });

    if (prismaUser === null) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `User with UUID ${user.uuid} not found in the database`,
      });
    }

    const _chats = await prisma.chat.findMany({
      where: {
        chatMemberships: {
          some: {
            userId: prismaUser.uuid,
            hasDeleted: false,
          },
        },
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            messageEvents: {
              where: { type: { in: USER_RELEVANT_MESSAGE_EVENTS } },
              orderBy: { uuid: 'desc' },
            },
            contentVersions: {
              take: 1, // include only the latest content version
              orderBy: { revision: 'desc' },
            },
          },
        },
        chatMemberships: { include: { user: true } },
      },
      orderBy: { lastUpdate: 'desc' },
    });

    return _chats.map((chat): ChatWithMessagePreview => {
      const messages = chat.messages.sort(
        (m1, m2) => m1.createdAt.getTime() - m2.createdAt.getTime(),
      );
      const lastMessage = messages.at(-1);

      if (lastMessage === undefined) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `No last message found in chat with ID ${chat.uuid}`,
        });
      }

      return {
        unreadCount: messages
          .filter((message) => message.senderId !== prismaUser.uuid)
          .filter(
            (message) =>
              !message.messageEvents.some((event) => event.type === MessageEventType.READ),
          ).length,
        lastUpdate: chat.lastUpdate,
        name: resolveChatName(
          chat.name,
          chat.chatMemberships.map((membership) => ({
            name: membership.user.name,
            uuid: membership.user.uuid,
          })),
          user,
        ),
        chatType: chat.type,
        id: chat.uuid,
        lastMessage: {
          id: lastMessage.uuid,
          createdAt: chat.lastUpdate,
          messagePreview: getMessagePreviewText(lastMessage),
          senderId: lastMessage.senderId ?? undefined,
          status: getStatusFromMessageEvents(lastMessage.messageEvents),
        },
      };
    });
  });
