'use client';
import type { ChatMessage } from '@/features/chat/api/types';
import { MessageComponent } from '@/features/chat/components/chat-view/message';
import { useChatId } from '@/features/chat/context/chat-id-context';
import { useChatDetail } from '@/features/chat/hooks/use-chats';
import { trpc } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { Loader2 } from 'lucide-react';
import { useCurrentLocale } from 'next-i18n-router/client';
import React from 'react';

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

import { useChatScrollManager } from '@/features/chat/hooks/use-chat-scroll-manager';
import { useMessageInfiniteScroll } from '@/features/chat/hooks/use-message-infinite-scroll';
import { useMessageReadStatus } from '@/features/chat/hooks/use-message-read-status';

export const MessageList: React.FC<{
  parentId?: string;
  hideReplyCount?: boolean;
  isThread?: boolean;
  parentMessage?: ChatMessage;
}> = ({ parentId, hideReplyCount = false, isThread = false, parentMessage }) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const chatId = useChatId();
  const { data: chatDetails, isLoading } = useChatDetail(chatId);
  const { data: currentUser } = trpc.chat.user.useQuery({});

  const { sortedMessages, isFetchingNextPage, topSentinelReference } = useMessageInfiniteScroll({
    chatId,
    parentId: parentId ?? undefined,
    parentMessage: parentMessage ?? undefined,
  });

  useMessageReadStatus({
    chatId,
    currentUser,
    sortedMessages,
  });

  const { scrollContainerReference, messagesEndReference, handleScroll } = useChatScrollManager({
    sortedMessages,
    isFetchingNextPage,
  });

  if (isLoading || currentUser === undefined || chatDetails === undefined) {
    return (
      <div className="flex h-screen flex-row items-center justify-center bg-gray-50">
        <div className="font-body text-gray-600">{loadingMessagesText[locale]}</div>
      </div>
    );
  }

  // Group messages by date
  const messagesByDate: Record<string, typeof sortedMessages> = {};
  for (const message of sortedMessages) {
    const date = new Date(message.createdAt).toLocaleDateString();
    messagesByDate[date] ??= [];
    messagesByDate[date].push(message);
  }

  return (
    <div
      ref={scrollContainerReference}
      onScroll={handleScroll}
      className={cn('flex h-full flex-col overflow-x-hidden overflow-y-auto bg-gray-50')}
    >
      {!isThread && <div className="flex-1" />}
      <div className={cn('px-2', isThread ? 'space-y-3 py-1' : 'space-y-6 py-4')}>
        {/* Load more sentinel */}
        <div ref={topSentinelReference} className="h-1 w-full opacity-0" aria-hidden="true" />

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

                const isThreadRoot =
                  typeof parentMessage?.id === 'string' && parentMessage.id === message.id;
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
