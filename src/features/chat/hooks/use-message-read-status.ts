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

/**
 * The latest message the server can mark as read for `currentUser`: a system message or one
 * someone else sent. Queued and failed bubbles are skipped, since the server has never
 * stored them and refuses them as a read watermark, and the chat would be marked again on
 * every render.
 */
export const findLatestMessageToRead = (
  sortedMessages: ChatMessage[],
  currentUser: string,
): ChatMessage | undefined =>
  [...sortedMessages].reverse().find((message) => {
    if (message.isPendingOffline === true || message.sendFailed === true) return false;
    if (message.type === MessageType.SYSTEM_MSG) return true;
    if (message.senderId === SYSTEM_SENDER_ID) return true;
    if (typeof message.senderId !== 'string') return true;
    return message.senderId !== currentUser;
  });

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
        // nothing cached (a chat opened by link): an empty list here would stay until it is stale
        if (!oldChats) return oldChats;
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
    // Only a failure needs the server's count back; on success the optimistic zero is the
    // answer, and refetching here doubled the list queries of every message read live.
    onError: () => {
      trpcUtils.chat.chats.invalidate().catch(console.error);
    },
  });

  useEffect(() => {
    if (currentUser !== undefined && sortedMessages.length > 0) {
      const latestMessageToRead = findLatestMessageToRead(sortedMessages, currentUser);

      if (
        latestMessageToRead !== undefined &&
        lastMarkedReadIdReference.current !== latestMessageToRead.id
      ) {
        markChatAsRead({
          chatId: chatId,
          lastMessageId: latestMessageToRead.id,
        });
      }
    }
  }, [markChatAsRead, currentUser, sortedMessages, chatId]);
};
