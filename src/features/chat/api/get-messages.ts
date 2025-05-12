'use server';

import type { Chat, ChatDetail } from '@/features/chat/types/chat';
import { PrismaClient } from '@/lib/prisma/client';
import type { HitobitoNextAuthUser } from '@/types/hitobito-next-auth-user';
import { auth } from '@/utils/auth-helpers';

const prisma = new PrismaClient();

export const getChats = async (): Promise<Chat[]> => {
  const session = await auth();
  const user = session?.user as unknown as HitobitoNextAuthUser | undefined;

  if (user === undefined) {
    throw new Error('User not authenticated');
  }

  let prismaUser = await prisma.user.findUnique({
    where: {
      ceviDbID: user.cevi_db_uuid.toString(),
    },
  });

  // create user if not exists
  prismaUser ??= await prisma.user.create({
    data: {
      ceviDbID: user.cevi_db_uuid.toString(),
      name: user.name,
    },
  });

  const chats = await prisma.chat.findMany({
    where: {
      users: {
        some: {
          uuid: prismaUser.uuid,
        },
      },
    },
    include: {
      messages: true,
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
      name: chat.name,
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
    name: chat.name,
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
    participants: [
      {
        id: user.cevi_db_uuid.toString(),
        name: user.name,
        isOnline: Math.random() >= 0.5,
      },
    ],
  };
};
