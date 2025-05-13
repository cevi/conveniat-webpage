'use server';

import prisma from '@/features/chat/database';
import type { Chat, ChatDetail } from '@/features/chat/types/chat';
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

export const getChats = async (): Promise<Chat[]> => {
  const session = await auth();
  const user = session?.user as unknown as HitobitoNextAuthUser | undefined;

  if (user === undefined) {
    throw new Error('User not authenticated');
  }

  let prismaUser = await prisma.user.findUnique({
    where: {
      uuid: user.uuid,
    },
  });

  // create user if not exists
  prismaUser ??= await prisma.user.create({
    data: {
      uuid: user.uuid,
      name: user.name,
    },
  });

  const chats = await prisma.chat.findMany({
    where: {
      chatMemberships: {
        some: {
          userId: prismaUser.uuid,
        },
      },
    },
    include: {
      messages: true,
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

  return chats.map((chat): Chat => {
    const messages = chat.messages.sort(
      (m1, m2) => m1.timestamp.getTime() - m2.timestamp.getTime(),
    );
    const lastMessage = messages.at(-1);
    if (lastMessage === undefined) {
      throw new Error('No messages found in chat');
    }

    return {
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
        senderId: lastMessage.senderId,
      },
    };
  });
};

export const getChatDetail = async (chatID: string): Promise<ChatDetail> => {
  const session = await auth();
  const user = session?.user as unknown as HitobitoNextAuthUser | undefined;

  if (user === undefined) {
    throw new Error('User not authenticated');
  }

  const chat = await prisma.chat.findUnique({
    where: {
      uuid: chatID,
    },
    include: {
      messages: true,
      chatMemberships: {
        select: {
          user: true,
        },
      },
    },
  });

  if (chat === null) {
    throw new Error('Chat not found');
  }

  const messages = chat.messages;
  if (messages.length === 0) {
    throw new Error('No messages found in chat');
  }

  const lastMessage = messages.at(-1);
  if (lastMessage === undefined) {
    throw new Error('No messages found in chat');
  }

  return {
    lastUpdate: chat.lastUpdate,
    name: resolveChatName(
      chat.name,
      chat.chatMemberships.map((membership) => membership.user),
      user,
    ),
    id: chat.uuid,
    messages: messages.map((message) => ({
      id: message.uuid,
      timestamp: message.timestamp,
      content: message.content,
      senderId: message.senderId,
      // eslint-disable-next-line no-nested-ternary
      status: Math.random() >= 0.5 ? (Math.random() < 0.5 ? 'delivered' : 'read') : 'sent',
      isOptimistic: false,
    })),
    participants: chat.chatMemberships.map((membership) => ({
      id: membership.user.uuid,
      name: membership.user.name,
      isOnline: Math.random() >= 0.5,
    })),
  };
};
