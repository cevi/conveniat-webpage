'use client';

import type { ChatMessage } from '@/features/chat/api/types';
import { trpc } from '@/trpc/client';
import { useEffect } from 'react';
import superjson from 'superjson';

interface ChatRealtimeEvent {
  type: 'new_message' | 'message_updated';
  chatId: string;
  senderId: string;
  message: ChatMessage;
}

export const useChatSSE = (chatIds: string[]): void => {
  const trpcUtils = trpc.useUtils();
  const { data: currentUser } = trpc.chat.user.useQuery({});

  const chatIdsString = chatIds.join(',');

  useEffect(() => {
    if (chatIdsString.length === 0 || typeof currentUser !== 'string' || currentUser === '') {
      return;
    }

    const url = `/api/chat/sse?chatIds=${chatIdsString}`;
    const eventSource = new EventSource(url);

    const handleMessage = (event: MessageEvent<string>): void => {
      try {
        const parsed = superjson.parse(event.data);
        if (!parsed || typeof parsed !== 'object') return;

        const data = parsed as unknown as ChatRealtimeEvent;

        if (data.type === 'new_message') {
          // Direct TanStack cache injection for infinite messages
          trpcUtils.chat.infiniteMessages.setInfiniteData(
            {
              chatId: data.chatId,
              limit: 25,
              parentId: data.message.parentId ?? undefined,
            },
            (old) => {
              if (!old) return old;

              // Avoid duplicates
              const allItems = old.pages.flatMap((page) => page.items);
              if (allItems.some((item) => item.id === data.message.id)) {
                return old;
              }

              const hasOptimistic = allItems.some(
                (item) => item.id.startsWith('optimistic-') && item.senderId === currentUser,
              );

              return {
                ...old,
                pages: old.pages.map((page, index) => {
                  if (index === 0) {
                    if (hasOptimistic) {
                      return {
                        ...page,
                        items: page.items.map((item) =>
                          item.id.startsWith('optimistic-') && item.senderId === currentUser
                            ? data.message
                            : item,
                        ),
                      };
                    }
                    return {
                      ...page,
                      items: [data.message, ...page.items],
                    };
                  }
                  return page;
                }),
              };
            },
          );

          // Invalidate chat list overview for unread counts and sorting
          trpcUtils.chat.chats.invalidate().catch(console.error);

          // Direct TanStack cache injection for chatDetails instead of hard invalidation
          trpcUtils.chat.chatDetails.setData({ chatId: data.chatId }, (old) => {
            if (!old) return old;

            if (old.messages.some((item) => item.id === data.message.id)) {
              return old;
            }

            const hasOptimistic = old.messages.some(
              (item) => item.id.startsWith('optimistic-') && item.senderId === currentUser,
            );

            if (hasOptimistic) {
              return {
                ...old,
                messages: old.messages.map((item) =>
                  item.id.startsWith('optimistic-') && item.senderId === currentUser
                    ? data.message
                    : item,
                ),
              };
            }

            return {
              ...old,
              messages: [...old.messages, data.message],
            };
          });
        }

        if (data.type === 'message_updated') {
          // Invalidate the message query to get the updated content
          trpcUtils.chat.infiniteMessages
            .invalidate({
              chatId: data.chatId,
              limit: 25,
              parentId: data.message.parentId ?? undefined,
            })
            .catch(console.error);
        }
      } catch (error) {
        console.error('[SSE] Failed to process message event:', error);
      }
    };

    const handleError = (): void => {
      // EventSource auto-reconnects with exponential backoff
      console.warn('[SSE] EventSource connection error, will auto-reconnect');
    };

    eventSource.addEventListener('message', handleMessage);
    eventSource.addEventListener('error', handleError);

    return (): void => {
      eventSource.removeEventListener('message', handleMessage);
      eventSource.removeEventListener('error', handleError);
      eventSource.close();
    };
  }, [chatIdsString, currentUser, trpcUtils]);
};
