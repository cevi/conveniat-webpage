import { USER_RELEVANT_MESSAGE_EVENTS } from '@/features/chat/api/definitions';
import type { ChatDetails } from '@/features/chat/api/types';
import { getStatusFromMessageEvents } from '@/features/chat/api/utils/get-status-from-message-events';
import { resolveChatName } from '@/features/chat/api/utils/resolve-chat-name';
import { MessageEventType } from '@/lib/prisma/client';
import { trpcBaseProcedure } from '@/trpc/init';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

export const getChat = trpcBaseProcedure
  .input(z.object({ chatId: z.string().uuid() }))
  .query(async ({ input, ctx }): Promise<ChatDetails> => {
    const { chatId } = input;
    const { user, prisma } = ctx;

    const chat = await prisma.chat.findUnique({
      where: { uuid: chatId },
      include: {
        messages: {
          // eslint-disable-next-line unicorn/no-null
          where: { parentId: null },
          orderBy: { createdAt: 'desc' }, // Get newest messages first
          take: 25, // limit to the last 25 messages
          include: {
            messageEvents: {
              where: { type: { in: USER_RELEVANT_MESSAGE_EVENTS } },
              orderBy: { uuid: 'desc' },
            },
            contentVersions: {
              take: 1, // include only the latest content version
              orderBy: { revision: 'desc' },
            },
            sender: { select: { name: true } },
          },
        },
        chatMemberships: { include: { user: true } },
      },
    });

    if (chat === null) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `Chat with ID ${chatId} not found`,
      });
    }

    const messages = chat.messages;
    if (messages.length === 0) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `No messages found in chat with ID ${chatId} `,
      });
    }

    const lastMessage = messages.at(-1);
    if (lastMessage === undefined) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `No last message found in chat with ID ${chatId} `,
      });
    }

    return {
      name: resolveChatName(
        chat.name,
        chat.chatMemberships.map((membership) => membership.user),
        user,
        chat.type,
      ),
      id: chat.uuid,
      archivedAt: chat.archivedAt,
      type: chat.type,
      courseId: chat.courseId,
      // Reverse to chronological order (we fetched in desc to get newest 25)
      messages: [...messages].reverse().map((message) => {
        const isReadByAdmin = chat.adminReadAt !== null && message.createdAt <= chat.adminReadAt;
        return {
          id: message.uuid,
          createdAt: message.createdAt,
          messagePayload: message.contentVersions[0]?.payload ?? {},
          senderId: message.senderId ?? undefined,
          ...(message.sender?.name ? { senderName: message.sender.name } : {}),
          status: isReadByAdmin
            ? MessageEventType.READ
            : getStatusFromMessageEvents(message.messageEvents),
          type: message.type,
        };
      }),
      participants: (chat.type === 'ANNOUNCEMENT'
        ? chat.chatMemberships.filter((membership) => membership.user.uuid === user.uuid)
        : chat.chatMemberships
      ).map((membership) => ({
        id: membership.user.uuid,
        name: membership.user.name,
        isOnline: membership.user.lastSeen > new Date(Date.now() - 30 * 1000),
        chatPermission: membership.chatPermission,
        description: membership.user.description,
      })),
      capabilities: chat.capabilities,
      description: chat.description,
    };
  });
