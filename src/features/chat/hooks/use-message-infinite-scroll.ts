'use client';

import type { ChatMessage } from '@/features/chat/api/types';
import { CHAT_PAGE_SIZE } from '@/features/chat/constants';
import {
  FAILED_SENDS_UPDATED_EVENT,
  forgetFailedSend,
  getFailedChatMessages,
} from '@/features/chat/utils/failed-sends';
import { getPendingOutboxChatMessages } from '@/features/chat/utils/offline-outbox';
import { trpc } from '@/trpc/client';
import type { InfiniteData } from '@tanstack/react-query';
import type React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';

/** Pages kept of a chat nobody has open, see {@link keepNewestPages}. */
const RESTING_PAGE_COUNT = 4;

/**
 * Drops all but the newest `count` pages of a message list.
 *
 * Every refetch of an infinite query walks all loaded pages again, one request after the
 * other: reopening a chat, a realtime resync, and the offline chat sync. Someone reopening
 * a chat lands at the bottom and needs only the newest pages, so the history they scrolled
 * through is let go once the chat closes. `maxPages` cannot do this: the cursor only walks
 * towards older messages, and at the cap it drops the newest page to keep an older one.
 */
export const keepNewestPages = <TData, TPageParameter>(
  data: InfiniteData<TData, TPageParameter>,
  count: number,
): InfiniteData<TData, TPageParameter> => ({
  pages: data.pages.slice(0, count),
  pageParams: data.pageParams.slice(0, count),
});

interface MessageInfiniteScrollProperties {
  chatId: string;
  parentId: string | undefined;
  parentMessage: ChatMessage | undefined;
  currentUser: string | undefined;
}

export const useMessageInfiniteScroll = ({
  chatId,
  parentId,
  parentMessage,
  currentUser,
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
      // Coming back to the app or back online is a gap in the realtime stream, and
      // `useChatSSE` answers every gap with one resync that refetches this query. Refetching
      // here as well walked every loaded page a second time.
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      enabled: chatId !== '',
    },
  );

  const trpcUtils = trpc.useUtils();
  useEffect(() => {
    const input = { chatId, limit: CHAT_PAGE_SIZE, parentId: parentId ?? undefined };
    return (): void => {
      const data = trpcUtils.chat.infiniteMessages.getInfiniteData(input);
      if (data === undefined || data.pages.length <= RESTING_PAGE_COUNT) return;
      trpcUtils.chat.infiniteMessages.setInfiniteData(
        input,
        keepNewestPages(data, RESTING_PAGE_COUNT),
      );
    };
  }, [chatId, parentId, trpcUtils]);

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
    globalThis.addEventListener(FAILED_SENDS_UPDATED_EVENT, handleOutboxUpdate);
    return (): void => {
      globalThis.removeEventListener('conveniat:outbox-updated', handleOutboxUpdate);
      globalThis.removeEventListener(FAILED_SENDS_UPDATED_EVENT, handleOutboxUpdate);
    };
  }, []);

  const fetchedMessages = useMemo(
    () => infiniteData?.pages.flatMap((page) => page.items).reverse() ?? [],
    [infiniteData],
  );

  // Hydrate any pending offline messages from localStorage outbox if not present in fetchedMessages
  const pendingOutboxMessages = useMemo(
    () => [
      ...getPendingOutboxChatMessages(chatId, parentId, currentUser),
      ...getFailedChatMessages(chatId, parentId, currentUser),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [chatId, parentId, currentUser, outboxVersion],
  );

  // A failed send the server did store after all (a lost response) turns up in the fetched
  // pages; the local copy would otherwise come back as a ghost once it scrolls out of them.
  useEffect(() => {
    for (const failed of getFailedChatMessages(chatId, parentId, currentUser)) {
      const isStored = fetchedMessages.some(
        // a pending copy is only a retry in flight, not proof the server has it
        (m) => m.id === failed.id && m.sendFailed !== true && m.status !== 'CREATED',
      );
      if (isStored) {
        forgetFailedSend(failed.id);
      }
    }
  }, [chatId, parentId, currentUser, fetchedMessages]);

  const sortedMessages = useMemo(() => {
    const missingOutboxMessages = pendingOutboxMessages.filter(
      (pending) => !fetchedMessages.some((m) => m.id === pending.id),
    );

    // local-only messages are appended, so put them back in time order among the fetched ones
    let finalMessages =
      missingOutboxMessages.length === 0
        ? fetchedMessages
        : [...fetchedMessages, ...missingOutboxMessages].sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
          );
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
