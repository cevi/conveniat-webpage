import type { ChatDetails, ChatMessage } from '@/features/chat/api/types';
import { CHAT_PAGE_SIZE } from '@/features/chat/constants';
import { getOfflineOutbox, removeMessageFromOutbox } from '@/features/chat/utils/offline-outbox';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { trpc } from '@/trpc/client';
import type { AppRouter } from '@/trpc/routers/_app';
import type { InfiniteData } from '@tanstack/react-query';
import type { inferProcedureOutput } from '@trpc/server';
import { useEffect, useRef } from 'react';

type InfiniteMessagesOutput = inferProcedureOutput<AppRouter['chat']['infiniteMessages']>;
type InfiniteMessagesData = InfiniteData<InfiniteMessagesOutput, string | null>;

/**
 * Hook to automatically monitor network connectivity and sequentialize synchronization
 * of the offline message outbox queue to the server.
 */
export const useOfflineQueueProcessor = (): void => {
  const isOnline = useOnlineStatus();
  const trpcUtils = trpc.useUtils();
  const sendMessageMutation = trpc.chat.sendMessage.useMutation();
  const isProcessingReference = useRef(false);
  const mutateAsyncReference = useRef(sendMessageMutation.mutateAsync);

  useEffect(() => {
    mutateAsyncReference.current = sendMessageMutation.mutateAsync;
  }, [sendMessageMutation.mutateAsync]);

  useEffect(() => {
    if (!isOnline || isProcessingReference.current) return;

    const processQueue = async (): Promise<void> => {
      const queue = getOfflineOutbox();
      if (queue.length === 0) return;

      isProcessingReference.current = true;
      console.log(`[Offline Sync] Found ${queue.length} pending offline messages. Syncing...`);

      let abortedDueToNetwork = false;
      let syncedCount = 0;

      for (const message of queue) {
        try {
          // Send mutation sequentially to preserve order using the stable ref
          const createdMessageData = await mutateAsyncReference.current({
            chatId: message.chatId,
            content: message.content,
            quotedMessageId: message.quotedMessageId,
            parentId: message.parentId,
          });

          const realMessage = createdMessageData as unknown as ChatMessage | undefined;
          if (!realMessage) {
            throw new Error('Server returned empty message payload during offline sync');
          }

          // 1. Swap optimistic ID with real database ID in infinite messages
          trpcUtils.chat.infiniteMessages.setInfiniteData(
            {
              chatId: message.chatId,
              limit: CHAT_PAGE_SIZE,
              parentId: message.parentId ?? undefined,
            },
            (data: InfiniteMessagesData | undefined): InfiniteMessagesData | undefined => {
              if (!data) return data;
              return {
                ...data,
                pages: data.pages.map((page) => ({
                  ...page,
                  items: page.items.map((item) => (item.id === message.id ? realMessage : item)),
                })),
              };
            },
          );

          // 2. Swap optimistic ID in chat details
          if (!message.parentId) {
            trpcUtils.chat.chatDetails.setData(
              { chatId: message.chatId },
              (oldData: ChatDetails | undefined): ChatDetails | undefined => {
                if (!oldData) return oldData;
                return {
                  ...oldData,
                  messages: oldData.messages.map((item) =>
                    item.id === message.id ? realMessage : item,
                  ),
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
        } catch (error) {
          console.error(`[Offline Sync] Failed to sync offline message ${message.id}:`, error);

          const isNetworkError =
            !navigator.onLine ||
            String(error).includes('fetch') ||
            String(error).includes('NetworkError') ||
            String(error).includes('Failed to fetch');

          if (isNetworkError) {
            // Stop queue processing and wait for connection to stabilize
            abortedDueToNetwork = true;
            break;
          }

          // For permanent errors (e.g. invalid content/permissions), remove from outbox to prevent blockages
          removeMessageFromOutbox(message.id);
        }
      }

      // Invalidate chats list to refresh sidebars and unread counters ONLY if we succeeded and did not abort
      if (syncedCount > 0 && !abortedDueToNetwork) {
        void trpcUtils.chat.chats.invalidate();
      }
      isProcessingReference.current = false;
    };

    void processQueue();
  }, [isOnline, trpcUtils]);
};

// eslint-disable-next-line unicorn/no-null
export const OfflineQueueSync = (): null => {
  useOfflineQueueProcessor();
  // eslint-disable-next-line unicorn/no-null
  return null;
};
