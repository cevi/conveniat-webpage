import { USER_RELEVANT_MESSAGE_EVENTS } from '@/features/chat/api/definitions';
import { getStatusFromMessageEvents } from '@/features/chat/api/utils/get-status-from-message-events';
import { resolveChatName } from '@/features/chat/api/utils/resolve-chat-name';
import type { ChatWithMessagePreview } from '@/features/chat/types/api-dto-types';
import { MessageEventType } from '@/lib/prisma';
import { trpcBaseProcedure } from '@/trpc/init';
import { databaseTransactionWrapper } from '@/trpc/middleware/database-transaction-wrapper';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

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
          // TODO: replace with properly formatted message preview
          messagePreview: JSON.stringify(lastMessage.contentVersions[0]?.payload ?? {}),
          senderId: lastMessage.senderId ?? undefined,
          status: getStatusFromMessageEvents(lastMessage.messageEvents),
        },
      };
    });
  });
