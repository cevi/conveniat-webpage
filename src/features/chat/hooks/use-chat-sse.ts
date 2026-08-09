'use client';

import type { ChatMessage } from '@/features/chat/api/types';
import { CHAT_PAGE_SIZE } from '@/features/chat/constants';
import { notifyRealtimeChatMessage } from '@/features/chat/utils/realtime-message-notification';
import type { ChatStatus } from '@/lib/chat-shared';
import { trpc } from '@/trpc/client';
import { useEffect } from 'react';
import superjson from 'superjson';

interface ChatRealtimeEvent {
  type: 'new_message' | 'message_updated' | 'chat_read_by_admin' | 'chat_updated' | 'new_chat';
  chatId: string;
  senderId: string;
  /** Delivery channel override (e.g. the user's own uuid for personal events); defaults to chatId. */
  channel?: string;
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
  const allSubscribedIds = [...activeChatSubscribers.keys()].map((id) => id.trim()).filter(Boolean);
  if (allSubscribedIds.length === 0) {
    if (globalEventSource) {
      globalEventSource.close();
      globalEventSource = undefined;
    }
    return;
  }
  console.warn('[SSE] EventSource connection error, will auto-reconnect');
};

function updateGlobalEventSource(currentUser: string): void {
  const allSubscribedIds = [...activeChatSubscribers.keys()]
    .map((id) => id.trim())
    .filter(Boolean)
    .sort();
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

  if (currentUser === '' || currentUser.trim() === '' || allSubscribedIds.length === 0) {
    return;
  }

  const url = `/api/chat/sse?chatIds=${allSubscribedIds.join(',')}`;
  const eventSource = new EventSource(url);
  globalEventSource = eventSource;

  const handleOpen = (): void => {
    console.log(`[Chat][SSE] Stream connected (subscribed chats: ${allSubscribedIds.join(', ')})`);
  };

  const handleMessage = (event: MessageEvent<string>): void => {
    try {
      const parsed = superjson.parse(event.data);
      if (parsed === null || typeof parsed !== 'object') return;

      const data = parsed as unknown as ChatRealtimeEvent;
      console.log(`[Chat][SSE] Received "${data.type}" event for chat ${data.chatId}`);

      // Dispatch to all listeners registered for the delivery channel. Events
      // delivered on the user's personal channel (e.g. new_chat) carry a
      // `channel` field because the client has no listener for the chat yet.
      const channel = data.channel ?? data.chatId;
      const listeners = activeChatSubscribers.get(channel);
      if (listeners) {
        for (const listener of listeners) {
          try {
            listener(data);
          } catch (error) {
            console.error('[Chat][SSE] Listener callback failed:', error);
          }
        }
      } else {
        console.warn(`[Chat][SSE] No listener registered for channel ${channel}, event dropped.`);
      }
    } catch (error) {
      console.error('[Chat][SSE] Failed to process message event:', error);
    }
  };

  eventSource.addEventListener('open', handleOpen);
  eventSource.addEventListener('message', handleMessage);
  eventSource.addEventListener('error', handleError);
}

export const useChatSSE = (chatIds: string[]): void => {
  const trpcUtils = trpc.useUtils();
  const { data: currentUser } = trpc.chat.user.useQuery({});

  const validChatIds = chatIds.map((id) => id.trim()).filter(Boolean);
  const chatIdsString = validChatIds.sort().join(',');

  useEffect(() => {
    if (typeof currentUser !== 'string' || currentUser.trim() === '') {
      return;
    }

    const ids = chatIdsString.split(',').filter(Boolean);

    const listener = (data: ChatRealtimeEvent): void => {
      if (data.type === 'new_chat') {
        trpcUtils.chat.chats.invalidate().catch(console.error);
        return;
      }

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
        // Raise a foreground notification for messages landing in a chat the user
        // is not currently looking at. Inside the native app Firebase does not
        // render anything while the app is open, so this is the only signal the
        // user gets; de-duplicated against the FCM bridge event by message id.
        notifyRealtimeChatMessage({
          chatId: data.chatId,
          chatName: trpcUtils.chat.chats.getData({})?.find((chat) => chat.id === data.chatId)?.name,
          message,
          currentUserId: currentUser,
        });

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

        if (message.parentId !== undefined && message.parentId !== '') {
          // Update the getMessage query cache for the parent message
          trpcUtils.chat.getMessage.setData({ messageId: message.parentId }, (old) => {
            if (!old) return old;
            return {
              ...old,
              replyCount: old.replyCount + 1,
              hasUnreadReplies: message.senderId === currentUser ? old.hasUnreadReplies : true,
            };
          });

          trpcUtils.chat.infiniteMessages.setInfiniteData(
            {
              chatId: data.chatId,
              limit: CHAT_PAGE_SIZE,
              parentId: undefined,
            },
            (old) => {
              if (!old) return old;
              return {
                ...old,
                pages: old.pages.map((page) => ({
                  ...page,
                  items: page.items.map((item) => {
                    if (item.id === message.parentId) {
                      return {
                        ...item,
                        replyCount: (item.replyCount ?? 0) + 1,
                        hasUnreadReplies:
                          message.senderId === currentUser ? item.hasUnreadReplies : true,
                      };
                    }
                    return item;
                  }),
                })),
              };
            },
          );

          trpcUtils.chat.chatDetails.setData({ chatId: data.chatId }, (old) => {
            if (!old) return old;
            return {
              ...old,
              messages: old.messages.map((item) => {
                if (item.id === message.parentId) {
                  return {
                    ...item,
                    replyCount: (item.replyCount ?? 0) + 1,
                    hasUnreadReplies:
                      message.senderId === currentUser ? item.hasUnreadReplies : true,
                  };
                }
                return item;
              }),
            };
          });
        }

        // If a system message arrives, invalidate chatDetails to refresh capabilities and status (e.g. closing/locking chat)
        if (message.type === 'SYSTEM_MSG') {
          trpcUtils.chat.chatDetails.invalidate({ chatId: data.chatId }).catch(console.error);
        }

        // Direct TanStack cache injection for chatDetails instead of hard invalidation
        if (typeof message.parentId !== 'string' || message.parentId === '') {
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

    // Also register listener for currentUser to receive personal / direct notifications
    let userListeners = activeChatSubscribers.get(currentUser);
    if (!userListeners) {
      userListeners = new Set();
      activeChatSubscribers.set(currentUser, userListeners);
    }
    userListeners.add(listener);

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

      // Also unregister listener for currentUser
      const activeUserListeners = activeChatSubscribers.get(currentUser);
      if (activeUserListeners) {
        activeUserListeners.delete(listener);
        if (activeUserListeners.size === 0) {
          activeChatSubscribers.delete(currentUser);
        }
      }

      // Trigger update of global event source after unregistering
      updateGlobalEventSource(currentUser);
    };
  }, [chatIdsString, currentUser, trpcUtils]);
};
