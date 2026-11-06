'use client';
import type { ChatMessage } from '@/features/chat/api/types';
import type { ChatWithMessagePreview } from '@/features/chat/types/api-dto-types';
import { SYSTEM_SENDER_ID } from '@/lib/chat-shared';
import { MessageType } from '@/lib/prisma';
import { useTRPC } from '@/trpc/client';
import { closeChatNotifications } from '@/utils/close-notifications';
import { useEffect, useRef, useSyncExternalStore } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

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
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const isVisible = useIsDocumentVisible();
  const lastMarkedReadIdReference = useRef<string | undefined>(confirmedReadWatermarks.get(chatId));
  const lastMarkedAtReference = useRef(0);

  useEffect(() => {
    lastMarkedReadIdReference.current = confirmedReadWatermarks.get(chatId);
  }, [chatId]);

  // the callbacks are handed to useMutation itself, so the compiler sees they run after render
  const { mutate: markChatAsRead } = useMutation({
    ...trpc.chat.markChatAsRead.mutationOptions<void>(),
    retry: false,
    onMutate: () => {
      // What the notifications show has now been read, and the next message would add to
      // the chat's notification rather than start a fresh one.
      void closeChatNotifications(chatId);

      // Optimistically update the chat overview
      queryClient.setQueryData(
        trpc.chat.chats.queryKey({}),
        (oldChats: ChatWithMessagePreview[] | undefined) => {
          // nothing cached (a chat opened by link): an empty list here would stay until it is stale
          if (!oldChats) return oldChats;
          return oldChats.map((chat: ChatWithMessagePreview) => {
            if (chat.id === chatId) {
              return {
                ...chat,
                unreadCount: 0,
                isMarkedUnread: false,
              };
            }
            return chat;
          });
        },
      );
    },
    onSuccess: (_data, variables) => {
      confirmedReadWatermarks.set(variables.chatId, variables.lastMessageId);
      lastMarkedReadIdReference.current = variables.lastMessageId;
    },
    // Only a failure needs the server's count back; on success the optimistic zero is the
    // answer, and refetching here doubled the list queries of every message read live.
    onError: () => {
      queryClient.invalidateQueries(trpc.chat.chats.pathFilter()).catch(console.error);
    },
  });

  // "Als ungelesen markieren" is undone by opening the chat. The read receipt cannot do it
  // alone: the chat may already be read up to its newest message in this session, or end in
  // the reader's own message, and then no receipt goes out.
  const { mutate: markChatUnread } = useMutation(
    trpc.chat.markChatUnread.mutationOptions({
      retry: false,
      onMutate: () => {
        queryClient.setQueryData(
          trpc.chat.chats.queryKey({}),
          (oldChats: ChatWithMessagePreview[] | undefined) =>
            oldChats?.map((chat) =>
              chat.id === chatId ? { ...chat, isMarkedUnread: false, unreadCount: 0 } : chat,
            ),
        );
      },
      onError: () => {
        queryClient.invalidateQueries(trpc.chat.chats.pathFilter()).catch(console.error);
      },
    }),
  );
  const isMarkedUnread =
    useQuery(trpc.chat.chats.queryOptions({}, { enabled: false })).data?.find(
      (chat) => chat.id === chatId,
    )?.isMarkedUnread === true;

  useEffect(() => {
    if (!isVisible || !isAtBottom || !isMarkedUnread) return;
    markChatUnread({ chatId, unread: false });
  }, [chatId, isAtBottom, isMarkedUnread, isVisible, markChatUnread]);

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
