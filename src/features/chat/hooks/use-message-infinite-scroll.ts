'use client';

import type { ChatMessage } from '@/features/chat/api/types';
import { trpc } from '@/trpc/client';
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
      getNextPageParam: (lastPage, allPages): string | undefined => {
        console.log('getNextPageParam check:', {
          itemsCount: lastPage.items.length,
          nextCursor: lastPage.nextCursor,
          allPagesCount: allPages.length,
        });
        return lastPage.nextCursor ?? undefined;
      },
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      enabled: chatId !== '',
    },
  );

  const topSentinelReference = useRef<HTMLDivElement>(null);

  useEffect(() => {
    console.log('InfiniteScroll effect:', { hasNextPage, isFetchingNextPage });
    const observer = new IntersectionObserver(
      (entries) => {
        const firstEntry = entries[0];
        console.log('Sentinel intersection:', {
          isIntersecting: firstEntry?.isIntersecting,
          hasNextPage,
          isFetchingNextPage,
          chatId,
          parentId,
        });

        if (
          typeof firstEntry?.isIntersecting === 'boolean' &&
          firstEntry.isIntersecting &&
          typeof hasNextPage === 'boolean' &&
          hasNextPage &&
          !isFetchingNextPage
        ) {
          console.log('Triggering fetchNextPage');
          fetchNextPage().catch(console.error);
        }
      },
      { threshold: 0.1 },
    );

    const sentinel = topSentinelReference.current;
    if (sentinel) observer.observe(sentinel);

    return (): void => {
      if (sentinel) observer.unobserve(sentinel);
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
