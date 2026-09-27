import type { ChatDetails, ChatMessage } from '@/features/chat/api/types';
import { CHAT_PAGE_SIZE } from '@/features/chat/constants';
import { markMessageSendFailed } from '@/features/chat/hooks/use-message-send';
import {
  dropCachedEntry,
  isServerCompatibleId,
  mergeStoredMessage,
  mergeStoredMessageAcrossPages,
} from '@/features/chat/utils';
import type { SendMessageInput } from '@/features/chat/utils/failed-sends';
import { rememberFailedSend } from '@/features/chat/utils/failed-sends';
import type { OfflineMessage } from '@/features/chat/utils/offline-outbox';
import {
  getOfflineOutbox,
  isOutboxItemOwnedBy,
  isSendInFlight,
  removeMessageFromOutbox,
  saveOfflineOutbox,
  toPendingChatMessage,
} from '@/features/chat/utils/offline-outbox';
import { isRetryableSendError } from '@/features/chat/utils/send-errors';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { trpc } from '@/trpc/client';
import type { AppRouter } from '@/trpc/routers/_app';
import type { InfiniteData } from '@tanstack/react-query';
import type { inferProcedureOutput } from '@trpc/server';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

type InfiniteMessagesOutput = inferProcedureOutput<AppRouter['chat']['infiniteMessages']>;
type InfiniteMessagesData = InfiniteData<InfiniteMessagesOutput, string | null>;

let isGlobalQueueProcessing = false;

/** The send a queued message replays, identical on every attempt and on a manual retry. */
const toSendInput = (message: OfflineMessage): SendMessageInput => {
  // Preserve the original composition time; fall back to now if the stored value is unparsable
  const queuedAt = new Date(message.createdAt);
  return {
    chatId: message.chatId,
    content: message.content,
    type: message.messageType,
    timestamp: Number.isNaN(queuedAt.getTime()) ? new Date() : queuedAt,
    quotedMessageId: message.quotedMessageId,
    parentId: message.parentId,
    messageId: message.id,
  };
};

/**
 * Hook to automatically monitor network connectivity and sequentialize synchronization
 * of the offline message outbox queue to the server.
 */
export const useOfflineQueueProcessor = (): void => {
  const isOnline = useOnlineStatus();
  const trpcUtils = trpc.useUtils();
  const sendMessageMutation = trpc.chat.sendMessage.useMutation({ networkMode: 'always' });
  const mutateAsyncReference = useRef(sendMessageMutation.mutateAsync);
  const createChatMutation = trpc.chat.createChat.useMutation({ networkMode: 'always' });
  const createChatMutateAsyncReference = useRef(createChatMutation.mutateAsync);
  const router = useRouter();
  // Read through a ref: the drain lives in a long-running effect that must not be torn
  // down and restarted whenever the router identity changes.
  const routerReference = useRef(router);

  useEffect(() => {
    mutateAsyncReference.current = sendMessageMutation.mutateAsync;
  }, [sendMessageMutation.mutateAsync]);

  useEffect(() => {
    createChatMutateAsyncReference.current = createChatMutation.mutateAsync;
  }, [createChatMutation.mutateAsync]);

  useEffect(() => {
    routerReference.current = router;
  }, [router]);

  useEffect(() => {
    const processQueue = async (): Promise<void> => {
      if (!isOnline || isGlobalQueueProcessing) return;

      if (getOfflineOutbox().length === 0) return;

      isGlobalQueueProcessing = true;
      let abortedDueToNetwork = false;
      let syncedCount = 0;

      try {
        // Only the sends of whoever is logged in: after a session expired on a shared
        // phone, the outbox can still hold what the previous user queued.
        let currentUser: string;
        try {
          currentUser = await trpcUtils.chat.user.ensureData({});
        } catch {
          return;
        }
        const queue = getOfflineOutbox().filter((item) => isOutboxItemOwnedBy(item, currentUser));
        if (queue.length === 0) return;
        console.log(`[Offline Sync] Found ${queue.length} pending offline messages. Syncing...`);

        for (const message of queue) {
          // Sent right now by the page that queued it. Stop rather than skip, so nothing
          // queued after it overtakes it; removing it from the outbox restarts the drain.
          if (isSendInFlight(message.id)) break;
          try {
            if (message.type === 'CREATE_CHAT') {
              const createdChatId = await createChatMutateAsyncReference.current({
                chatName: message.chatName,
                members: message.memberIds.map((userId) => ({ userId })),
                // Hand the queued id to the server so the chat is stored under the id the
                // client already opened, and so a replay of this drain is recognised as
                // one. Entries queued by older app versions carry an opaque
                // `offline-chat-…` id the server cannot adopt - those still get a
                // server-assigned id, which is swapped in below.
                ...(isServerCompatibleId(message.id) ? { chatId: message.id } : {}),
              });

              if (!createdChatId)
                throw new Error('Server returned empty chat ID during offline sync');

              const realChatId = createdChatId;

              // Swap optimistic ID with real ID in outbox
              const currentOutbox = getOfflineOutbox();
              const updatedOutbox = currentOutbox
                .map((o) => {
                  if (o.type === 'MESSAGE' && o.chatId === message.id) {
                    return { ...o, chatId: realChatId };
                  }
                  return o;
                })
                .filter((o) => o.id !== message.id); // Remove the CREATE_CHAT action itself

              saveOfflineOutbox(updatedOutbox);

              // Update the in-memory array so subsequent items in this loop use the real ID
              for (const upcoming of queue) {
                if (upcoming.type === 'MESSAGE' && upcoming.chatId === message.id) {
                  upcoming.chatId = realChatId;
                }
              }

              if (realChatId !== message.id) {
                trpcUtils.chat.chats.setData({}, (oldChats) => {
                  if (!oldChats) return oldChats;
                  // A one-to-one creation is answered with the *existing* private chat when
                  // the two already have one, and that chat is already in the list - drop
                  // the placeholder instead of renaming it onto a duplicate id.
                  return oldChats.some((c) => c.id === realChatId)
                    ? oldChats.filter((c) => c.id !== message.id)
                    : oldChats.map((c) => (c.id === message.id ? { ...c, id: realChatId } : c));
                });

                // The caches seeded when the chat was created offline are keyed by the
                // optimistic id and describe a chat that does not exist under that id -
                // drop them so nothing renders a chat the server will never answer for.
                trpcUtils.chat.chatDetails.setData({ chatId: message.id }, dropCachedEntry);
                trpcUtils.chat.infiniteMessages.setInfiniteData(
                  { chatId: message.id, limit: CHAT_PAGE_SIZE, parentId: undefined },
                  dropCachedEntry,
                );

                // The user may still be sitting on `/app/chat/<optimisticId>`, a route the
                // server will never answer for. Without this the view queries the dropped
                // id, gets NOT_FOUND and shows the permanent error screen; follow the chat
                // the creation actually resolved to instead. Mirrors the online path in
                // `useCreateChat`.
                //
                // Read from `location` rather than `usePathname()`: this hook sits in the
                // app shell, and subscribing it to URL data marks every page that renders
                // the shell as dynamic, which breaks prerendering under Cache Components.
                // The drain only ever runs in the browser, where `location` is both
                // available and always current.
                if (globalThis.location.pathname.includes(message.id)) {
                  routerReference.current.replace(`/app/chat/${realChatId}`);
                }
              }

              syncedCount++;
              console.log(`[Offline Sync] Sequenced chat created: ${message.id} -> ${realChatId}`);
            } else {
              // Send message mutation sequentially to preserve order
              const createdMessageData = await mutateAsyncReference.current(toSendInput(message));

              const realMessage = createdMessageData as unknown as ChatMessage | undefined;
              if (!realMessage) {
                throw new Error('Server returned empty message payload during offline sync');
              }

              // 1. Replace the queued message with the stored one in infinite messages.
              // The ids normally match (the server persists the client-generated id), so
              // this also collapses a copy the SSE stream may have raced in.
              trpcUtils.chat.infiniteMessages.setInfiniteData(
                {
                  chatId: message.chatId,
                  limit: CHAT_PAGE_SIZE,
                  parentId: message.parentId ?? undefined,
                },
                (data: InfiniteMessagesData | undefined): InfiniteMessagesData | undefined => {
                  if (!data) return data;
                  const merged = mergeStoredMessageAcrossPages(
                    data.pages.map((page) => page.items),
                    realMessage,
                    message.id,
                  );
                  return {
                    ...data,
                    pages: data.pages.map((page, index) => ({
                      ...page,
                      items: merged[index] ?? page.items,
                    })),
                  };
                },
              );

              // 2. Same for chat details
              if (!message.parentId) {
                trpcUtils.chat.chatDetails.setData(
                  { chatId: message.chatId },
                  (oldData: ChatDetails | undefined): ChatDetails | undefined => {
                    if (!oldData) return oldData;
                    return {
                      ...oldData,
                      messages: mergeStoredMessage(oldData.messages, realMessage, message.id),
                    };
                  },
                );
              }

              // 3. Remove message from localStorage outbox
              removeMessageFromOutbox(message.id);
              syncedCount++;
              console.log(
                `[Offline Sync] Sequenced message synced: ${message.id} -> ${realMessage.id}`,
              );
            }
          } catch (error) {
            console.error(`[Offline Sync] Failed to sync offline item ${message.id}:`, error);

            if (isRetryableSendError(error)) {
              // Stop here and replay from this item on the next drain, so the order holds
              abortedDueToNetwork = true;
              break;
            }

            // A permanent failure (e.g. 400 Bad Request, 403 Forbidden) leaves the queue so it
            // does not block the items behind it. A message keeps its bubble as a failed send
            // with its own retry and delete, so its text is never dropped without a trace.
            removeMessageFromOutbox(message.id);
            if (message.type === 'MESSAGE') {
              markMessageSendFailed(trpcUtils, {
                chatId: message.chatId,
                parentId: message.parentId,
                messageId: message.id,
              });
              rememberFailedSend(toPendingChatMessage(message, currentUser), toSendInput(message));
            }
          }
        }
      } finally {
        isGlobalQueueProcessing = false;
      }

      // Invalidate chats list to refresh sidebars and unread counters ONLY if we succeeded and did not abort
      if (syncedCount > 0 && !abortedDueToNetwork) {
        void trpcUtils.chat.chats.invalidate();
      }
    };

    // Trigger processing on mount / network change / outbox update
    void processQueue();

    // Setup periodic polling interval (every 10 seconds) while online to process any remaining queued messages
    const intervalId = globalThis.setInterval(() => {
      void processQueue();
    }, 10_000);

    const handleSyncEvent = (): void => {
      void processQueue();
    };

    globalThis.addEventListener('online', handleSyncEvent);
    globalThis.addEventListener('conveniat:outbox-updated', handleSyncEvent);

    return (): void => {
      globalThis.clearInterval(intervalId);
      globalThis.removeEventListener('online', handleSyncEvent);
      globalThis.removeEventListener('conveniat:outbox-updated', handleSyncEvent);
    };
  }, [isOnline, trpcUtils]);
};

export const OfflineQueueSync = (): null => {
  useOfflineQueueProcessor();
  // eslint-disable-next-line unicorn/no-null
  return null;
};
