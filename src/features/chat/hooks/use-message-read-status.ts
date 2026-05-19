'use client';

import type { ChatMessage } from '@/features/chat/api/types';
import type { ChatWithMessagePreview } from '@/features/chat/types/api-dto-types';
import { MessageEventType } from '@/lib/prisma/client';
import { trpc } from '@/trpc/client';
import { useEffect, useState } from 'react';

interface MessageReadStatusProperties {
  chatId: string;
  currentUser: string | undefined;
  sortedMessages: ChatMessage[];
}

// Module-level watermark cache to persist last read message IDs across hook re-mounts/routes within the session
const sessionReadWatermarks = new Map<string, string>();

export const useMessageReadStatus = ({
  chatId,
  currentUser,
  sortedMessages,
}: MessageReadStatusProperties): void => {
  const trpcUtils = trpc.useUtils();
  const [lastMarkedReadId, setLastMarkedReadId] = useState<string | undefined>(() => {
    return sessionReadWatermarks.get(chatId);
  });

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
    onSettled: () => {
      trpcUtils.chat.chats.invalidate().catch(console.error);
    },
  });

  useEffect(() => {
    if (currentUser !== undefined && sortedMessages.length > 0) {
      // Find the latest message not sent by the current user
      const latestMessageToRead = [...sortedMessages]
        .reverse()
        .find((message) => message.senderId !== currentUser);

      if (
        latestMessageToRead !== undefined &&
        latestMessageToRead.status !== MessageEventType.READ &&
        (lastMarkedReadId === undefined || latestMessageToRead.id > lastMarkedReadId)
      ) {
        markChatAsRead({
          chatId: chatId,
          lastMessageId: latestMessageToRead.id,
        });
        sessionReadWatermarks.set(chatId, latestMessageToRead.id);
        queueMicrotask(() => {
          setLastMarkedReadId(latestMessageToRead.id);
        });
      }
    }
  }, [markChatAsRead, currentUser, sortedMessages, chatId, lastMarkedReadId]);
};
