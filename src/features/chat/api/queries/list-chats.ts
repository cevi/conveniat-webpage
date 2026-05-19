import { getMessagePreviewText } from '@/features/chat/api/utils/get-message-preview-text';
import { resolveChatName } from '@/features/chat/api/utils/resolve-chat-name';
import type { ChatWithMessagePreview } from '@/features/chat/types/api-dto-types';
import {
  LARGE_CHAT_THRESHOLD,
  SYSTEM_SENDER_ID,
  USER_RELEVANT_MESSAGE_EVENTS,
  getStatusFromMessageEvents,
} from '@/lib/chat-shared';
import { ChatMembershipPermission, type Prisma } from '@/lib/prisma';
import { trpcBaseProcedure } from '@/trpc/init';
import { databaseTransactionWrapper } from '@/trpc/middleware/database-transaction-wrapper';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

export const getChatList = trpcBaseProcedure
  .input(z.object({}))
  .use(databaseTransactionWrapper)
  .query(async ({ ctx }): Promise<ChatWithMessagePreview[]> => {
    const { user, prisma } = ctx;

    const prismaUser = await prisma.user.findUnique({
      where: { uuid: user.uuid },
    });

    if (prismaUser === null) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
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
          orderBy: { createdAt: 'desc' },
          take: 1,
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
        _count: { select: { messages: true } },
      },
      orderBy: { lastUpdate: 'desc' },
    });

    // 1. Prepare unread count conditions for all chats and fetch them in a single batch groupBy query
    const unreadCountMap = new Map<string, number>();

    if (_chats.length > 0) {
      const unreadQueries = _chats.map((chat) => {
        const currentUserMembership = chat.chatMemberships.find(
          (m) => m.userId === prismaUser.uuid,
        );
        const lastReadId = currentUserMembership?.lastReadMessageId;

        const baseCondition: Prisma.MessageWhereInput = {
          chatId: chat.uuid,
          senderId: { not: prismaUser.uuid },
        };

        if (lastReadId !== null && lastReadId !== undefined && lastReadId !== '') {
          baseCondition.uuid = { gt: lastReadId };
        }

        return baseCondition;
      });

      const unreadCounts = await prisma.message.groupBy({
        by: ['chatId'],
        where: {
          OR: unreadQueries,
        },
        _count: {
          uuid: true,
        },
      });

      for (const item of unreadCounts) {
        unreadCountMap.set(item.chatId, item._count.uuid);
      }
    }

    // 2. Map retrieved chats synchronously to their DTO representation
    return _chats.map((chat): ChatWithMessagePreview => {
      const lastMessage = chat.messages[0];

      if (lastMessage === undefined) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `No last message found in chat with ID ${chat.uuid}`,
        });
      }

      const currentUserMembership = chat.chatMemberships.find((m) => m.userId === prismaUser.uuid);
      const isLarge = chat.chatMemberships.length >= LARGE_CHAT_THRESHOLD;

      const rawCount = unreadCountMap.get(chat.uuid) ?? 0;
      const unreadCount = isLarge && rawCount > 0 ? 1 : rawCount;

      return {
        unreadCount,
        lastUpdate: chat.lastUpdate,
        name: resolveChatName(
          chat.name,
          chat.chatMemberships.map((membership) => ({
            name: membership.user.name,
            uuid: membership.user.uuid,
          })),
          user,
        ),
        description: chat.description,
        status: chat.status,
        chatType: chat.type,
        id: chat.uuid,
        messageCount: chat._count.messages,
        lastMessage: {
          id: lastMessage.uuid,
          createdAt: chat.lastUpdate,
          messagePreview: getMessagePreviewText(lastMessage),
          senderId: lastMessage.senderId ?? SYSTEM_SENDER_ID,
          status: getStatusFromMessageEvents(lastMessage.messageEvents),
        },
        userChatPermission: currentUserMembership?.chatPermission ?? ChatMembershipPermission.GUEST,
      };
    });
  });
