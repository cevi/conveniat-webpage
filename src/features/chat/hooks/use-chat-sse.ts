'use client';

import type { ChatMessage } from '@/features/chat/api/types';
import { CHAT_PAGE_SIZE } from '@/features/chat/constants';
import { mergeStoredMessage, mergeStoredMessageAcrossPages } from '@/features/chat/utils';
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

/**
 * A cached message the client created itself and that the server has not confirmed yet.
 */
const isUnconfirmed = (message: ChatMessage): boolean =>
  message.isPendingOffline === true || message.status === 'CREATED';

// Global registry of all active chat subscribers on the client to enable multiplexing/deduplication
const activeChatSubscribers = new Map<string, Set<(event: ChatRealtimeEvent) => void>>();
const activeReconnectListeners = new Set<() => void>();
let globalEventSource: EventSource | undefined;
let currentSubscribedIds = new Set<string>();
let updateTimeout: ReturnType<typeof setTimeout> | undefined;
let hasConnectedBefore = false;

/**
 * Tells every subscriber to refetch, because the stream may have missed events -
 * either it was down and reconnected, or the server signalled a delivery gap.
 */
const notifyReconnectListeners = (): void => {
  for (const listener of activeReconnectListeners) {
    try {
      listener();
    } catch (error) {
      console.error('[Chat][SSE] Reconnect listener failed:', error);
    }
  }
};

/**
 * The server lost and re-established its Postgres LISTEN connection while this
 * stream stayed open: no error, no reconnect, just a gap in the delivered events.
 */
const handleServerResync = (): void => {
  console.warn('[Chat][SSE] Server signalled a delivery gap, refetching');
  notifyReconnectListeners();
};

const handleError = (): void => {
  const allSubscribedIds = [...activeChatSubscribers.keys()].map((id) => id.trim()).filter(Boolean);
  if (allSubscribedIds.length === 0) {
    if (globalEventSource) {
      globalEventSource.close();
      globalEventSource = undefined;
    }
    currentSubscribedIds.clear();
    return;
  }
  console.warn('[SSE] EventSource connection error, will auto-reconnect');
};

function updateGlobalEventSource(currentUser: string): void {
  if (updateTimeout) {
    clearTimeout(updateTimeout);
  }

  updateTimeout = setTimeout(() => {
    const allSubscribedIds = [...activeChatSubscribers.keys()]
      .map((id) => id.trim())
      .filter(Boolean);

    if (currentUser === '' || currentUser.trim() === '' || allSubscribedIds.length === 0) {
      if (globalEventSource) {
        globalEventSource.close();
        globalEventSource = undefined;
      }
      currentSubscribedIds.clear();
      return;
    }

    // Exact match check: if the new IDs exactly match the current live set, skip reconnect
    const isExactMatch =
      allSubscribedIds.length === currentSubscribedIds.size &&
      allSubscribedIds.every((id) => currentSubscribedIds.has(id));
    if (isExactMatch && globalEventSource) {
      return;
    }

    // Close existing event source because we need to expand the subscription set
    if (globalEventSource) {
      globalEventSource.close();
      globalEventSource = undefined;
    }

    currentSubscribedIds = new Set(allSubscribedIds);
    const idsArray = [...currentSubscribedIds].sort();

    const url = `/api/chat/sse?chatIds=${idsArray.join(',')}`;
    const eventSource = new EventSource(url);
    globalEventSource = eventSource;

    const handleOpen = (): void => {
      console.log(`[Chat][SSE] Stream connected (subscribed chats: ${idsArray.join(', ')})`);
      if (hasConnectedBefore) {
        notifyReconnectListeners();
      }
      hasConnectedBefore = true;
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
    eventSource.addEventListener('resync', handleServerResync);
    eventSource.addEventListener('error', handleError);
  }, 0);
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

            const pages = old.pages.map((page) => page.items);
            const existing = pages.flat().find((item) => item.id === message.id);

            // Our own sends carry a client-generated id that the server persists verbatim,
            // so an id hit is either the optimistic bubble of this very message or a repeat
            // of an event we already applied. Only the former needs upgrading — matching on
            // the id alone (instead of on "any optimistic message of mine") is what keeps a
            // batch of queued offline messages from all collapsing onto the first arrival.
            if (existing) {
              if (!isUnconfirmed(existing)) return old;

              const merged = mergeStoredMessageAcrossPages(pages, message, message.id);
              return {
                ...old,
                pages: old.pages.map((page, index) => ({
                  ...page,
                  items: merged[index] ?? page.items,
                })),
              };
            }

            return {
              ...old,
              pages: old.pages.map((page, index) =>
                index === 0 ? { ...page, items: [message, ...page.items] } : page,
              ),
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

            const existing = old.messages.find((item) => item.id === message.id);
            if (existing) {
              if (!isUnconfirmed(existing)) return old;
              return {
                ...old,
                messages: mergeStoredMessage(old.messages, message, message.id),
              };
            }

            return {
              ...old,
              messages: [...old.messages, message],
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

    const reconnectListener = (): void => {
      trpcUtils.chat.chats.invalidate().catch(console.error);
      for (const chatId of ids) {
        trpcUtils.chat.infiniteMessages.invalidate({ chatId }).catch(console.error);
        trpcUtils.chat.chatDetails.invalidate({ chatId }).catch(console.error);
      }
    };
    activeReconnectListeners.add(reconnectListener);

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

      activeReconnectListeners.delete(reconnectListener);

      // Trigger update of global event source after unregistering
      updateGlobalEventSource(currentUser);
    };
  }, [chatIdsString, currentUser, trpcUtils]);
};
