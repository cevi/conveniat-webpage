'use server';

import prisma from '@/features/chat/database';
import type { ChatDetailDto, ChatDto } from '@/features/chat/types/api-dto-types';
import { MessageStatusDto } from '@/features/chat/types/api-dto-types';
import type { MessageEvent } from '@/lib/prisma';
import { MessageEventType } from '@/lib/prisma';
import type { HitobitoNextAuthUser } from '@/types/hitobito-next-auth-user';
import { auth } from '@/utils/auth-helpers';

const resolveChatName = (
  chatName: string,
  users: {
    name: string;
    uuid: string;
  }[],
  currentUer: HitobitoNextAuthUser,
): string => {
  if (users.length > 2) {
    return chatName;
  }

  const otherUser = users.find((user) => user.uuid !== currentUer.uuid.toString());
  if (otherUser) {
    return otherUser.name;
  }

  // fallback
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

export const getChats = async (): Promise<ChatDto[]> => {
  const session = await auth();
  const user = session?.user as unknown as HitobitoNextAuthUser | undefined;

  if (user === undefined) {
    throw new Error('User not authenticated');
  }

  const prismaUser = await prisma.user.findUnique({
    where: {
      uuid: user.uuid,
    },
  });

  if (prismaUser === null) {
    throw new Error('User not found');
  }

  const chats = await prisma.chat.findMany({
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

  return chats.map((chat): ChatDto => {
    const messages = chat.messages.sort(
      (m1, m2) => m1.timestamp.getTime() - m2.timestamp.getTime(),
    );
    const lastMessage = messages.at(-1);
    if (lastMessage === undefined) {
      throw new Error('No messages found in chat');
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
};

export const getChatDetail = async (
  chatID: string,
): Promise<
  | ChatDetailDto
  | {
      error: string;
    }
> => {
  const session = await auth();
  const user = session?.user as unknown as HitobitoNextAuthUser | undefined;

  if (user === undefined) {
    return { error: 'User not authenticated' };
  }

  const chat = await prisma.chat.findUnique({
    where: {
      uuid: chatID,
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
    return { error: 'Chat not found' };
  }

  const messages = chat.messages;
  if (messages.length === 0) {
    return { error: 'No messages found in chat' };
  }

  const lastMessage = messages.at(-1);
  if (lastMessage === undefined) {
    return { error: 'No messages found in chat' };
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
};
