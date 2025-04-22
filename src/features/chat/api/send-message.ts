'use server';

import { chatStore } from '@/features/chat/api/message-in-memory-store';
import type { ChatDetail, Message, SendMessage } from '@/features/chat/types/chat';
import type { HitobitoNextAuthUser } from '@/types/hitobito-next-auth-user';
import { auth } from '@/utils/auth-helpers';

export const sendMessage = async (message: SendMessage): Promise<void> => {
  // get current user
  const session = await auth();
  const user = session?.user as unknown as HitobitoNextAuthUser | undefined;
  if (user === undefined) {
    throw new Error('User not authenticated');
  }

  // TODO: save message to a database
  if (chatStore.has(user.cevi_db_uuid)) {
    const chats = chatStore.get(user.cevi_db_uuid);
    if (chats) {
      const chat = chats.find((_chat: ChatDetail) => _chat.id === message.chatId);
      if (chat) {
        const chatMessage: Message = {
          id: `message-${Math.random()}`,
          senderId: user.cevi_db_uuid.toString(),
          content: message.content,
          timestamp: new Date(),
        };

        chat.messages.push(chatMessage);
        chat.lastMessage = chatMessage;
      }
    }
  }

  // TODO: send push notification to the recipient
  console.log(`Push notification sent to participants of chat-id=${message.chatId}`);
};
