import type { ChatDto } from '@/features/chat/types/api-dto-types';
import { MessageStatusDto } from '@/features/chat/types/api-dto-types';
import { MessageEventType } from '@/lib/prisma';
import { trpcBaseProcedure } from '@/trpc/init';
import type { HitobitoNextAuthUser } from '@/types/hitobito-next-auth-user';
import type { ChatMembershipPermission, MessageEvent } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

// Helper functions for resolving chat names and message statuses
const resolveChatName = (
  chatName: string,
  users: { name: string; uuid: string }[],
  currentUser: HitobitoNextAuthUser,
): string => {
  if (users.length > 2) {
    return chatName;
  }

  const otherUser = users.find((user) => user.uuid !== currentUser.uuid.toString());
  if (otherUser) {
    return otherUser.name;
  }

  // Fallback
  return chatName;
};

const getStatusFromMessageEvents = (messageEvents: MessageEvent[]): MessageStatusDto => {
  if (messageEvents.some((event) => event.eventType === MessageEventType.USER_READ)) {
    return MessageStatusDto.READ;
  }

  if (messageEvents.some((event) => event.eventType === MessageEventType.USER_RECEIVED)) {
    return MessageStatusDto.DELIVERED;
  }

  if (
    messageEvents.some((event) => event.eventType === MessageEventType.SERVER_RECEIVED) ||
    messageEvents.some((event) => event.eventType === MessageEventType.SERVER_SENT)
  ) {
    return MessageStatusDto.SENT;
  }

  return MessageStatusDto.CREATED;
};

export const chats = trpcBaseProcedure.input(z.object({})).query(async ({ ctx }) => {
  const { user, prisma } = ctx;

  const prismaUser = await prisma.user.findUnique({
    where: {
      uuid: user.uuid,
    },
  });

  if (prismaUser === null) {
    throw new Error('User not found');
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
        orderBy: {
          timestamp: 'asc',
        },
        include: {
          messageEvents: {
            orderBy: {
              timestamp: 'asc',
            },
          },
        },
      },
      chatMemberships: {
        include: {
          user: true,
        },
      },
    },
    orderBy: {
      lastUpdate: 'desc',
    },
  });

  return _chats.map((chat): ChatDto => {
    const messages = chat.messages.sort(
      (m1, m2) => m1.timestamp.getTime() - m2.timestamp.getTime(),
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
            !message.messageEvents.some((event) => event.eventType === MessageEventType.USER_READ),
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
      id: chat.uuid,
      lastMessage: {
        id: lastMessage.uuid,
        timestamp: chat.lastUpdate,
        content: lastMessage.content,
        senderId: lastMessage.senderId ?? undefined,
        status: getStatusFromMessageEvents(lastMessage.messageEvents),
      },
    };
  });
});

interface ChatMessage {
  id: string;
  timestamp: Date;
  content: string;
  senderId: string | undefined;
  status: MessageStatusDto;
}

interface ChatParticipant {
  id: string;
  name: string;
  isOnline: boolean;
  chatPermission: ChatMembershipPermission;
}

export interface ChatDetails {
  name: string;
  id: string;
  isArchived: boolean;
  messages: ChatMessage[];
  participants: ChatParticipant[];
}

export const chatDetails = trpcBaseProcedure
  .input(z.object({ chatId: z.string().uuid() }))
  .query(async ({ input, ctx }): Promise<ChatDetails> => {
    const { chatId } = input;
    const { user, prisma } = ctx;

    const chat = await prisma.chat.findUnique({
      where: {
        uuid: chatId,
      },
      include: {
        messages: {
          orderBy: {
            timestamp: 'asc',
          },
          include: {
            messageEvents: {
              orderBy: {
                timestamp: 'asc',
              },
            },
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
      isArchived: chat.isArchived,
      messages: messages.map((message) => ({
        id: message.uuid,
        timestamp: message.timestamp,
        content: message.content,
        senderId: message.senderId ?? undefined,
        status: getStatusFromMessageEvents(message.messageEvents),
      })),
      participants: chat.chatMemberships.map((membership) => ({
        id: membership.user.uuid,
        name: membership.user.name,
        isOnline: membership.user.lastSeen > new Date(Date.now() - 30 * 1000),
        chatPermission: membership.chatPermission,
      })),
    };
  });
