'use client';

import type { ChatMessage } from '@/features/chat/api/types';
import { CHAT_PAGE_SIZE } from '@/features/chat/constants';
import { getPendingOutboxChatMessages } from '@/features/chat/utils/offline-outbox';
import { trpc } from '@/trpc/client';
import type React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';

interface MessageInfiniteScrollProperties {
  chatId: string;
  parentId: string | undefined;
  parentMessage: ChatMessage | undefined;
}

export const useMessageInfiniteScroll = ({
  chatId,
  parentId,
  parentMessage,
}: MessageInfiniteScrollProperties): {
  sortedMessages: ChatMessage[];
  isFetchingNextPage: boolean;
  topSentinelReference: React.RefObject<HTMLDivElement | null>;
} => {
  const {
    data: infiniteData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = trpc.chat.infiniteMessages.useInfiniteQuery(
    { chatId, limit: CHAT_PAGE_SIZE, parentId: parentId ?? undefined },
    {
      getNextPageParam: (lastPage): string | undefined => {
        return lastPage.nextCursor ?? undefined;
      },
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 60 * 24 * 7,

      refetchOnMount: 'always',
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      enabled: chatId !== '',
    },
  );

  const topSentinelReference = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const firstEntry = entries[0];

        if (
          typeof firstEntry?.isIntersecting === 'boolean' &&
          firstEntry.isIntersecting &&
          typeof hasNextPage === 'boolean' &&
          hasNextPage &&
          !isFetchingNextPage
        ) {
          fetchNextPage().catch(console.error);
        }
      },
      { threshold: 0.1 },
    );

    const sentinel = topSentinelReference.current;
    if (sentinel) observer.observe(sentinel);

    return (): void => {
      observer.disconnect();
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, chatId, parentId]);

  const [outboxVersion, setOutboxVersion] = useState(0);

  useEffect(() => {
    const handleOutboxUpdate = (): void => setOutboxVersion((v) => v + 1);
    globalThis.addEventListener('conveniat:outbox-updated', handleOutboxUpdate);
    return (): void => {
      globalThis.removeEventListener('conveniat:outbox-updated', handleOutboxUpdate);
    };
  }, []);

  const fetchedMessages = useMemo(
    () => infiniteData?.pages.flatMap((page) => page.items).reverse() ?? [],
    [infiniteData],
  );

  // Hydrate any pending offline messages from localStorage outbox if not present in fetchedMessages
  const pendingOutboxMessages = useMemo(
    () => getPendingOutboxChatMessages(chatId, parentId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [chatId, parentId, outboxVersion],
  );

  const sortedMessages = useMemo(() => {
    const missingOutboxMessages = pendingOutboxMessages.filter(
      (pending) => !fetchedMessages.some((m) => m.id === pending.id),
    );

    let finalMessages = [...fetchedMessages, ...missingOutboxMessages];
    if (parentMessage && !finalMessages.some((m) => m.id === parentMessage.id)) {
      finalMessages = [parentMessage, ...finalMessages];
    } else if (finalMessages.length === 0 && parentMessage) {
      finalMessages = [parentMessage];
    }
    return finalMessages;
  }, [fetchedMessages, pendingOutboxMessages, parentMessage]);

  return {
    sortedMessages,
    isFetchingNextPage: !!isFetchingNextPage,
    topSentinelReference,
  };
};
