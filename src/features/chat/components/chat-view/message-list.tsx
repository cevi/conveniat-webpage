'use client';
import type { ChatMessage } from '@/features/chat/api/types';
import { MessageComponent } from '@/features/chat/components/chat-view/message';
import { useChatId } from '@/features/chat/context/chat-id-context';
import { useChatDetail } from '@/features/chat/hooks/use-chats';
import type { ChatWithMessagePreview } from '@/features/chat/types/api-dto-types';
import { MessageEventType } from '@/lib/prisma/client';
import { trpc } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { Loader2 } from 'lucide-react';
import { useCurrentLocale } from 'next-i18n-router/client';
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';

const loadingMessagesText: StaticTranslationString = {
  de: 'Nachrichten werden geladen...',
  en: 'Loading messages...',
  fr: 'Chargement des messages...',
};

const todayText: StaticTranslationString = {
  de: 'Heute',
  en: 'Today',
  fr: "Aujourd'hui",
};

export const MessageList: React.FC<{
  parentId?: string;
  hideReplyCount?: boolean;
  isThread?: boolean;
  parentMessage?: ChatMessage;
}> = ({ parentId, hideReplyCount = false, isThread = false, parentMessage }) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const chatId = useChatId();
  const trpcUtils = trpc.useUtils();
  const { mutate: changeMessageStatus } = trpc.chat.messageStatus.useMutation({
    retry: false,
    onMutate: () => {
      // Optimistically update the chat overview
      trpcUtils.chat.chats.setData({}, (oldChats: ChatWithMessagePreview[] | undefined) => {
        if (!oldChats) return [];
        return oldChats.map((chat: ChatWithMessagePreview) => {
          if (chat.id === chatId) {
            return {
              ...chat,
              unreadCount: Math.max(0, chat.unreadCount - 1),
            };
          }
          return chat;
        });
      });
    },
    onSettled: () => {
      trpcUtils.chat.chats.invalidate().catch(console.error);
    },
  });
  const { data: chatDetails, isLoading } = useChatDetail(chatId);
  const { data: currentUser } = trpc.chat.user.useQuery({});
  const messagesEndReference = useRef<HTMLDivElement>(null);

  // Fetch messages with infinite scrolling
  const {
    data: infiniteData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = trpc.chat.infiniteMessages.useInfiniteQuery(
    { chatId, limit: 25, ...(parentId && { parentId }) },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      initialCursor: undefined, // Start from the beginning (newest)
      // Refetch when window is refocused or connection restored
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      // Refetch periodically to get new messages
      refetchInterval: 5000,
    },
  );

  // Combine messages from all pages and reverse them (newest at bottom)
  // Prepend the parent message if provided (for thread view)
  const sortedMessages = React.useMemo(() => {
    if (!infiniteData) return parentMessage ? [parentMessage] : [];
    const fetchedMessages = infiniteData.pages.flatMap((page) => page.items).reverse();
    // Prepend parent message if provided and not already in the list
    if (parentMessage && !fetchedMessages.some((m) => m.id === parentMessage.id)) {
      return [parentMessage, ...fetchedMessages];
    }
    return fetchedMessages;
  }, [infiniteData, parentMessage]);

  // Track if this is the initial load and if user is at bottom
  const hasScrolledReference = useRef(false);
  const isAtBottomReference = useRef(true);
  const scrollContainerReference = useRef<HTMLDivElement>(null);

  // Track scroll position to know if user is at bottom and handle infinite scroll
  const handleScroll = (): void => {
    const container = scrollContainerReference.current;
    if (container) {
      const threshold = 100; // pixels from bottom to consider "at bottom"
      isAtBottomReference.current =
        container.scrollHeight - container.scrollTop - container.clientHeight < threshold;

      // Check if we need to load more messages
      if (container.scrollTop === 0 && hasNextPage && !isFetchingNextPage) {
        fetchNextPage().catch(console.error);
      }
    }
  };

  const previousScrollHeightReference = useRef<number>(0);
  const previousMessageCountReference = useRef<number>(0);

  // Adjust scroll position after loading older messages to maintain visual continuity
  useLayoutEffect(() => {
    const container = scrollContainerReference.current;
    if (!container) return;

    const currentMessageCount = sortedMessages.length;

    // If messages were added at the top (older messages loaded), adjust scroll position
    // to prevent the view from jumping.
    if (
      previousScrollHeightReference.current > 0 &&
      currentMessageCount > previousMessageCountReference.current
    ) {
      const newScrollHeight = container.scrollHeight;
      const heightDifference = newScrollHeight - previousScrollHeightReference.current;

      if (heightDifference > 0) {
        container.scrollTop += heightDifference;
      }
    }

    previousScrollHeightReference.current = container.scrollHeight;
    previousMessageCountReference.current = currentMessageCount;
  }, [sortedMessages, isFetchingNextPage]);

  useEffect(() => {
    // Scroll to bottom on initial load OR when user is at bottom and new messages arrive
    if (
      sortedMessages.length > 0 &&
      (!hasScrolledReference.current || isAtBottomReference.current)
    ) {
      messagesEndReference.current?.scrollIntoView({ behavior: 'instant' });
      hasScrolledReference.current = true;
    }
  }, [sortedMessages]);

  // State to store IDs of messages that have been marked as READ
  const [readMessageIds, setReadMessageIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (currentUser !== undefined && sortedMessages.length > 0) {
      const newReadMessageIds = new Set(readMessageIds);
      for (const message of sortedMessages) {
        if (
          message.senderId !== currentUser &&
          message.status !== MessageEventType.READ &&
          !newReadMessageIds.has(message.id)
        ) {
          console.log(`Changing status of message ${message.id} to READ`);
          changeMessageStatus({
            messageId: message.id,
            status: MessageEventType.READ,
          });
          newReadMessageIds.add(message.id);
        }
      }

      if (newReadMessageIds.size > readMessageIds.size) {
        setReadMessageIds(newReadMessageIds);
      }
    }
  }, [changeMessageStatus, currentUser, sortedMessages, readMessageIds]);

  // Handle loading states for both chatDetails and currentUser
  // This early return is fine because all hooks above it are called unconditionally.
  if (isLoading || currentUser === undefined || chatDetails === undefined) {
    return (
      <div className="flex h-screen flex-row items-center justify-center bg-gray-50">
        <div className="font-body text-gray-600">{loadingMessagesText[locale]}</div>
      </div>
    );
  }

  // Group messages by date - This logic can now safely access chatDetails.messages
  const messagesByDate: { [date: string]: typeof sortedMessages } = {};
  for (const message of sortedMessages) {
    const date = new Date(message.createdAt).toLocaleDateString();
    messagesByDate[date] ??= [];
    messagesByDate[date].push(message);
  }

  return (
    <div
      ref={scrollContainerReference}
      onScroll={handleScroll}
      className={cn('flex flex-col', !isThread && 'h-full overflow-y-auto bg-gray-50')}
    >
      {!isThread && <div className="flex-1" />}
      <div className={cn('px-2', isThread ? 'space-y-3 py-1' : 'space-y-6 py-4')}>
        {isFetchingNextPage && (
          <div className="flex w-full justify-center py-2">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        )}
        {Object.entries(messagesByDate).map(([date, messagesForDate]) => (
          <div key={date}>
            <div className={cn('flex justify-center', isThread ? 'my-3' : 'my-6')}>
              <div className="font-body rounded-full border border-gray-200 bg-gray-100 px-4 py-1 text-xs font-medium text-gray-500 shadow-sm">
                {date === new Date().toLocaleDateString() ? todayText[locale] : date}
              </div>
            </div>
            <div className="space-y-1">
              {messagesForDate.map((message, index) => {
                const previousMessage = index > 0 ? messagesForDate[index - 1] : undefined;
                const isWithin5Min = previousMessage
                  ? new Date(message.createdAt).getTime() -
                      new Date(previousMessage.createdAt).getTime() <
                    5 * 60 * 1000
                  : false;

                const isThreadRoot = parentMessage?.id === message.id;
                return (
                  <div key={message.id} className={isWithin5Min ? 'mt-1' : 'mt-4'}>
                    <MessageComponent
                      message={message}
                      isCurrentUser={message.senderId === currentUser}
                      chatType={chatDetails.type}
                      hideReplyCount={hideReplyCount}
                      isThreadRoot={isThreadRoot}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <div ref={messagesEndReference} />
      </div>
    </div>
  );
};
