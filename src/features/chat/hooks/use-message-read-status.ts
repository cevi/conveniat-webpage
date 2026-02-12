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

export const useMessageReadStatus = ({
  chatId,
  currentUser,
  sortedMessages,
}: MessageReadStatusProperties): void => {
  const trpcUtils = trpc.useUtils();
  const [readMessageIds, setReadMessageIds] = useState<Set<string>>(new Set());

  const { mutate: changeMessageStatus } = trpc.chat.messageStatus.useMutation({
    retry: false,
    onMutate: () => {
      // Optimistically update the chat overview
      trpcUtils.chat.chats.setData({}, (oldChats: ChatWithMessagePreview[] | undefined) => {
        if (!oldChats) return [];
        return oldChats.map((chat: ChatWithMessagePreview) => {
          if (chat.id === chatId) {
            return {
              ...chat,
              unreadCount: Math.max(0, chat.unreadCount - 1),
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
      const newReadMessageIds = new Set(readMessageIds);
      let statusChanged = false;

      for (const message of sortedMessages) {
        if (
          message.senderId !== currentUser &&
          message.status !== MessageEventType.READ &&
          !newReadMessageIds.has(message.id)
        ) {
          console.log(`Changing status of message ${message.id} to READ`);
          changeMessageStatus({
            messageId: message.id,
            status: MessageEventType.READ,
          });
          newReadMessageIds.add(message.id);
          statusChanged = true;
        }
      }

      if (statusChanged) {
        // Schedule state update to avoid cascading render warning
        queueMicrotask(() => {
          setReadMessageIds((previous) => {
            const updated = new Set(previous);
            for (const id of newReadMessageIds) updated.add(id);
            return updated;
          });
        });
      }
    }
  }, [changeMessageStatus, currentUser, sortedMessages, readMessageIds]);
};
