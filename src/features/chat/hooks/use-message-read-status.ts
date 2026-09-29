'use client';

import type { ChatMessage } from '@/features/chat/api/types';
import type { ChatWithMessagePreview } from '@/features/chat/types/api-dto-types';
import { SYSTEM_SENDER_ID } from '@/lib/chat-shared';
import { MessageType } from '@/lib/prisma';
import { trpc } from '@/trpc/client';
import { closeNotificationsByTag } from '@/utils/close-notifications';
import { chatNotificationTag } from '@/utils/notification-tags';
import { useEffect, useRef, useSyncExternalStore } from 'react';

interface MessageReadStatusProperties {
  chatId: string;
  currentUser: string | undefined;
  sortedMessages: ChatMessage[];
  /** Whether the reader is at the newest message, see `useChatScrollManager`. */
  isAtBottom: boolean;
}

/** Messages arriving in a burst are marked read together, at most once per interval. */
const MARK_READ_INTERVAL_MS = 1000;

const subscribeToVisibility = (onChange: () => void): (() => void) => {
  document.addEventListener('visibilitychange', onChange);
  return (): void => document.removeEventListener('visibilitychange', onChange);
};

const useIsDocumentVisible = (): boolean =>
  useSyncExternalStore(
    subscribeToVisibility,
    () => document.visibilityState === 'visible',
    () => true,
  );

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

/**
 * Marks the chat read up to the newest message the reader can actually see: only while the
 * page is visible and the list is scrolled to the bottom. A message that lands while the
 * app is in the background or the reader is deep in the history stays unread until they
 * come back to it.
 */
export const useMessageReadStatus = ({
  chatId,
  currentUser,
  sortedMessages,
  isAtBottom,
}: MessageReadStatusProperties): void => {
  const trpcUtils = trpc.useUtils();
  const isVisible = useIsDocumentVisible();
  const lastMarkedReadIdReference = useRef<string | undefined>(confirmedReadWatermarks.get(chatId));
  const lastMarkedAtReference = useRef(0);

  useEffect(() => {
    lastMarkedReadIdReference.current = confirmedReadWatermarks.get(chatId);
  }, [chatId]);

  const { mutate: markChatAsRead } = trpc.chat.markChatAsRead.useMutation({
    retry: false,
    onMutate: () => {
      // What the notification lists has now been read, and the next message would add
      // to it rather than start a fresh one.
      void closeNotificationsByTag(chatNotificationTag(chatId));

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
    if (!isVisible || !isAtBottom || currentUser === undefined) return;

    const latestMessageToRead = findLatestMessageToRead(sortedMessages, currentUser);
    if (
      latestMessageToRead === undefined ||
      lastMarkedReadIdReference.current === latestMessageToRead.id
    ) {
      return;
    }

    const markRead = (): void => {
      lastMarkedAtReference.current = Date.now();
      markChatAsRead({ chatId, lastMessageId: latestMessageToRead.id });
    };

    // at once unless one just went out, so a chat opened for a glance does not stay unread
    const wait = lastMarkedAtReference.current + MARK_READ_INTERVAL_MS - Date.now();
    if (wait <= 0) {
      markRead();
      return;
    }
    const timeout = setTimeout(markRead, wait);
    return (): void => clearTimeout(timeout);
  }, [markChatAsRead, currentUser, sortedMessages, chatId, isVisible, isAtBottom]);
};
