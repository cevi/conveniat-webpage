'use client';

import type { ChatMessage } from '@/features/chat/api/types';
import { CHAT_PAGE_SIZE } from '@/features/chat/constants';
import type { ChatStatus } from '@/lib/chat-shared';
import { trpc } from '@/trpc/client';
import { useEffect } from 'react';
import superjson from 'superjson';

interface ChatRealtimeEvent {
  type: 'new_message' | 'message_updated' | 'chat_read_by_admin' | 'chat_updated';
  chatId: string;
  senderId: string;
  message?: ChatMessage;
  chat?: {
    status: string;
    capabilities: string[];
  };
}

// Global registry of all active chat subscribers on the client to enable multiplexing/deduplication
const activeChatSubscribers = new Map<string, Set<(event: ChatRealtimeEvent) => void>>();
let globalEventSource: EventSource | undefined;
let currentSubscribedIdsString = '';

const handleError = (): void => {
  console.warn('[SSE] EventSource connection error, will auto-reconnect');
};

function updateGlobalEventSource(currentUser: string): void {
  const allSubscribedIds = [...activeChatSubscribers.keys()].sort();
  const subscribedIdsString = `${currentUser}|${allSubscribedIds.join(',')}`;

  if (subscribedIdsString === currentSubscribedIdsString) {
    return;
  }

  // Close existing event source
  if (globalEventSource) {
    globalEventSource.close();
    globalEventSource = undefined;
  }

  currentSubscribedIdsString = subscribedIdsString;

  if (subscribedIdsString.length === 0 || !currentUser) {
    return;
  }

  const url = `/api/chat/sse?chatIds=${allSubscribedIds.join(',')}`;
  const eventSource = new EventSource(url);
  globalEventSource = eventSource;

  const handleMessage = (event: MessageEvent<string>): void => {
    try {
      const parsed = superjson.parse(event.data);
      if (!parsed || typeof parsed !== 'object') return;

      const data = parsed as unknown as ChatRealtimeEvent;

      // Dispatch to all listeners registered for this chatId
      const listeners = activeChatSubscribers.get(data.chatId);
      if (listeners) {
        for (const listener of listeners) {
          try {
            listener(data);
          } catch (error) {
            console.error('[SSE] Listener callback failed:', error);
          }
        }
      }
    } catch (error) {
      console.error('[SSE] Failed to process message event:', error);
    }
  };

  eventSource.addEventListener('message', handleMessage);
  eventSource.addEventListener('error', handleError);
}

export const useChatSSE = (chatIds: string[]): void => {
  const trpcUtils = trpc.useUtils();
  const { data: currentUser } = trpc.chat.user.useQuery({});

  const chatIdsString = chatIds.join(',');

  useEffect(() => {
    if (chatIdsString.length === 0 || typeof currentUser !== 'string' || currentUser === '') {
      return;
    }

    const ids = chatIdsString.split(',').filter(Boolean);

    const listener = (data: ChatRealtimeEvent): void => {
      if (data.type === 'chat_read_by_admin') {
        trpcUtils.chat.infiniteMessages.invalidate({ chatId: data.chatId }).catch(console.error);
        trpcUtils.chat.chatDetails.invalidate({ chatId: data.chatId }).catch(console.error);
        trpcUtils.chat.chats.invalidate().catch(console.error);
        return;
      }

      if (data.type === 'chat_updated' && data.chat) {
        const updatedChatStatus = data.chat.status as ChatStatus;
        trpcUtils.chat.chatDetails.setData({ chatId: data.chatId }, (old) => {
          if (!old) return old;
          return {
            ...old,
            status: updatedChatStatus,
          };
        });
        trpcUtils.chat.chats.invalidate().catch(console.error);
        return;
      }

      if (!data.message) {
        return;
      }
      const message = data.message;

      if (data.type === 'new_message') {
        // Direct TanStack cache injection for infinite messages
        trpcUtils.chat.infiniteMessages.setInfiniteData(
          {
            chatId: data.chatId,
            limit: CHAT_PAGE_SIZE,
            parentId: message.parentId ?? undefined,
          },
          (old) => {
            if (!old) return old;

            // Avoid duplicates
            const allItems = old.pages.flatMap((page) => page.items);
            if (allItems.some((item) => item.id === message.id)) {
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
                          ? message
                          : item,
                      ),
                    };
                  }
                  return {
                    ...page,
                    items: [message, ...page.items],
                  };
                }
                return page;
              }),
            };
          },
        );

        // Invalidate chat list overview for unread counts and sorting
        trpcUtils.chat.chats.invalidate().catch(console.error);

        // If a system message arrives, invalidate chatDetails to refresh capabilities and status (e.g. closing/locking chat)
        if (message.type === 'SYSTEM_MSG') {
          trpcUtils.chat.chatDetails.invalidate({ chatId: data.chatId }).catch(console.error);
        }

        // Direct TanStack cache injection for chatDetails instead of hard invalidation
        if (!message.parentId) {
          trpcUtils.chat.chatDetails.setData({ chatId: data.chatId }, (old) => {
            if (!old) return old;

            if (old.messages.some((item) => item.id === message.id)) {
              return old;
            }

            const hasOptimistic = old.messages.some(
              (item) => item.id.startsWith('optimistic-') && item.senderId === currentUser,
            );

            const newMessages = hasOptimistic
              ? old.messages.map((item) =>
                  item.id.startsWith('optimistic-') && item.senderId === currentUser
                    ? message
                    : item,
                )
              : [...old.messages, message];

            return {
              ...old,
              messages: newMessages,
            };
          });
        }
      }

      if (data.type === 'message_updated') {
        // Invalidate the message query to get the updated content
        trpcUtils.chat.infiniteMessages
          .invalidate({
            chatId: data.chatId,
            limit: CHAT_PAGE_SIZE,
            parentId: message.parentId ?? undefined,
          })
          .catch(console.error);
      }
    };

    // Register listener for each chat channel
    for (const chatId of ids) {
      let listeners = activeChatSubscribers.get(chatId);
      if (!listeners) {
        listeners = new Set();
        activeChatSubscribers.set(chatId, listeners);
      }
      listeners.add(listener);
    }

    // Trigger update of global event source
    updateGlobalEventSource(currentUser);

    return (): void => {
      // Unregister listener for each chat channel
      for (const chatId of ids) {
        const listeners = activeChatSubscribers.get(chatId);
        if (listeners) {
          listeners.delete(listener);
          if (listeners.size === 0) {
            activeChatSubscribers.delete(chatId);
          }
        }
      }

      // Trigger update of global event source after unregistering
      updateGlobalEventSource(currentUser);
    };
  }, [chatIdsString, currentUser, trpcUtils]);
};
