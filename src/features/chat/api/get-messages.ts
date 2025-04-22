'use server';

import { chatStore } from '@/features/chat/api/message-in-memory-store';
import type { Chat, ChatDetail, Message } from '@/features/chat/types/chat';
import type { HitobitoNextAuthUser } from '@/types/hitobito-next-auth-user';
import { auth } from '@/utils/auth-helpers';

export const getChats = async (): Promise<Chat[]> => {
  const session = await auth();
  const user = session?.user as unknown as HitobitoNextAuthUser | undefined;

  if (user === undefined) {
    throw new Error('User not authenticated');
  }

  if (chatStore.has(user.cevi_db_uuid)) {
    const chats = chatStore.get(user.cevi_db_uuid);

    if (chats) {
      return chats.map((chat) => ({
        ...chat,
        messages: undefined,
        timestamp: new Date(Date.now() - Math.random() * 1000 * 60 * 60 * 24),
      }));
    }
  }

  // generate random chats if no chats are found
  const numberOfChats = Math.floor(Math.random() * 5) + 1;

  const chats = Array.from({ length: numberOfChats }, (_, index) => {
    const numberOfMessages = Math.floor(Math.random() * 10) + 1;

    const messages = Array.from(
      { length: numberOfMessages },
      () =>
        ({
          id: `message-${Math.random()}`,
          senderId: `user-${Math.floor(Math.random() * 10)}`,
          content: `This is a random message ${index + 1} in chat ${index}`,
          timestamp: new Date(Date.now() - Math.random() * 1000 * 60 * 60 * 24),
        }) as Message,
    );

    return {
      id: `chat-${numberOfChats}`,
      name: `Chat ${index + 1}`,
      messages,
      lastMessage: messages.at(-1),
      timestamp: new Date(Date.now() - Math.random() * 1000 * 60 * 60 * 24),
    } as ChatDetail;
  });

  chatStore.set(user.cevi_db_uuid, chats);
  return getChats();
};

export const getChatDetail = async (chatID: string): Promise<ChatDetail> => {
  const session = await auth();
  const user = session?.user as unknown as HitobitoNextAuthUser | undefined;

  if (user === undefined) {
    throw new Error('User not authenticated');
  }

  if (chatStore.has(user.cevi_db_uuid)) {
    const chats = chatStore.get(user.cevi_db_uuid);

    console.log('chats:', chats);
    if (chats) {
      const chatDetail = chats.find((chat) => chat.id === chatID);

      if (chatDetail) {
        return chatDetail;
      } else {
        throw new Error(
          `Chat with ID ${chatID} not found, only found ${chats.map((chat) => chat.id).join(', ')}`,
        );
      }
    }
  }

  throw new Error(
    `Chat with ID ${chatID} not found, only found ${JSON.stringify(chatStore.keys())}`,
  );
};
