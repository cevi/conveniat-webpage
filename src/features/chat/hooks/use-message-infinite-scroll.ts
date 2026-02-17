'use client';

import type { ChatMessage } from '@/features/chat/api/types';
import { trpc } from '@/trpc/client';
import type React from 'react';
import { useEffect, useRef } from 'react';

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
    { chatId, limit: 25, parentId: parentId ?? undefined },
    {
      getNextPageParam: (lastPage): string | undefined => {
        return lastPage.nextCursor ?? undefined;
      },
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

  const fetchedMessages = infiniteData?.pages.flatMap((page) => page.items).reverse() ?? [];

  let finalMessages = fetchedMessages;
  if (parentMessage && !fetchedMessages.some((m) => m.id === parentMessage.id)) {
    finalMessages = [parentMessage, ...fetchedMessages];
  } else if (fetchedMessages.length === 0 && parentMessage) {
    finalMessages = [parentMessage];
  }

  const sortedMessages = finalMessages;

  return {
    sortedMessages,
    isFetchingNextPage: !!isFetchingNextPage,
    topSentinelReference,
  };
};
