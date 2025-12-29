import { USER_RELEVANT_MESSAGE_EVENTS } from '@/features/chat/api/definitions';
import type { ChatDetails } from '@/features/chat/api/types';
import { getStatusFromMessageEvents } from '@/features/chat/api/utils/get-status-from-message-events';
import { resolveChatName } from '@/features/chat/api/utils/resolve-chat-name';
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
          },
        },
        chatMemberships: { include: { user: true } },
        capabilities: true,
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
        message: `No messages found in chat with ID ${chatId}`,
      });
    }

    const lastMessage = messages.at(-1);
    if (lastMessage === undefined) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `No last message found in chat with ID ${chatId}`,
      });
    }

    return {
      name: resolveChatName(
        chat.name,
        chat.chatMemberships.map((membership) => membership.user),
        user,
      ),
      id: chat.uuid,
      archivedAt: chat.archivedAt,
      type: chat.type,
      courseId: chat.courseId,
      // Reverse to chronological order (we fetched in desc to get newest 25)
      messages: [...messages].reverse().map((message) => ({
        id: message.uuid,
        createdAt: message.createdAt,
        messagePayload: message.contentVersions[0]?.payload ?? {},
        senderId: message.senderId ?? undefined,
        status: getStatusFromMessageEvents(message.messageEvents),
        type: message.type,
      })),
      participants: chat.chatMemberships.map((membership) => ({
        id: membership.user.uuid,
        name: membership.user.name,
        isOnline: membership.user.lastSeen > new Date(Date.now() - 30 * 1000),
        chatPermission: membership.chatPermission,
      })),
      capabilities: chat.capabilities.map((cap) => ({
        capability: cap.capability,
        isEnabled: cap.isEnabled,
      })),
    };
  });
