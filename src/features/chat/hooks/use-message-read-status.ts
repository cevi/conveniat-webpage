'use client';

import type { ChatMessage } from '@/features/chat/api/types';
import type { ChatWithMessagePreview } from '@/features/chat/types/api-dto-types';
import { SYSTEM_SENDER_ID } from '@/lib/chat-shared';
import { MessageType } from '@/lib/prisma';
import { trpc } from '@/trpc/client';
import { useEffect, useRef } from 'react';

interface MessageReadStatusProperties {
  chatId: string;
  currentUser: string | undefined;
  sortedMessages: ChatMessage[];
}

// Module-level watermark cache to record confirmed read message IDs per chat
const confirmedReadWatermarks = new Map<string, string>();

export const useMessageReadStatus = ({
  chatId,
  currentUser,
  sortedMessages,
}: MessageReadStatusProperties): void => {
  const trpcUtils = trpc.useUtils();
  const lastMarkedReadIdReference = useRef<string | undefined>(confirmedReadWatermarks.get(chatId));

  useEffect(() => {
    lastMarkedReadIdReference.current = confirmedReadWatermarks.get(chatId);
  }, [chatId]);

  const { mutate: markChatAsRead } = trpc.chat.markChatAsRead.useMutation({
    retry: false,
    onMutate: () => {
      // Optimistically update the chat overview
      trpcUtils.chat.chats.setData({}, (oldChats: ChatWithMessagePreview[] | undefined) => {
        if (!oldChats) return [];
        return oldChats.map((chat: ChatWithMessagePreview) => {
          if (chat.id === chatId) {
            return {
              ...chat,
              unreadCount: 0,
            };
          }
          return chat;
        });
      });
    },
    onSuccess: (_data, variables) => {
      confirmedReadWatermarks.set(variables.chatId, variables.lastMessageId);
      lastMarkedReadIdReference.current = variables.lastMessageId;
    },
    onSettled: () => {
      trpcUtils.chat.chats.invalidate().catch(console.error);
    },
  });

  useEffect(() => {
    if (currentUser !== undefined && sortedMessages.length > 0) {
      // Find the latest message to mark as read (system message or message not sent by current user)
      const latestMessageToRead = [...sortedMessages].reverse().find((message) => {
        if (message.type === MessageType.SYSTEM_MSG) return true;
        if (message.senderId === SYSTEM_SENDER_ID) return true;
        if (typeof message.senderId !== 'string') return true;
        return message.senderId !== currentUser;
      });

      if (
        latestMessageToRead !== undefined &&
        (lastMarkedReadIdReference.current === undefined ||
          latestMessageToRead.id > lastMarkedReadIdReference.current)
      ) {
        markChatAsRead({
          chatId: chatId,
          lastMessageId: latestMessageToRead.id,
        });
      }
    }
  }, [markChatAsRead, currentUser, sortedMessages, chatId]);
};
