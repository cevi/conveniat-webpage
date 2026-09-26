'use client';
import type { ChatMessage } from '@/features/chat/api/types';
import { MessageComponent } from '@/features/chat/components/chat-view/message';
import { useChatId } from '@/features/chat/context/chat-id-context';
import { useChatDetail } from '@/features/chat/hooks/use-chats';
import { trpc } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { ArrowDown, Loader2, MessagesSquare } from 'lucide-react';
import { useCurrentLocale } from 'next-i18n-router/client';
import React from 'react';

const loadingMessagesText: StaticTranslationString = {
  de: 'Nachrichten werden geladen...',
  en: 'Loading messages...',
  fr: 'Chargement des messages...',
};

const newMessagesText = (count: number, locale: Locale): string => {
  if (locale === 'de') return count === 1 ? '1 neue Nachricht' : `${count} neue Nachrichten`;
  if (locale === 'fr') return count === 1 ? '1 nouveau message' : `${count} nouveaux messages`;
  return count === 1 ? '1 new message' : `${count} new messages`;
};

const jumpToLatestText: StaticTranslationString = {
  de: 'Zur neusten Nachricht',
  en: 'Jump to latest message',
  fr: 'Aller au dernier message',
};

const emptyChatTitleText: StaticTranslationString = {
  de: 'Noch keine Nachrichten',
  en: 'No messages yet',
  fr: 'Pas encore de messages',
};

const emptyChatHintText: StaticTranslationString = {
  de: 'Schreib die erste Nachricht, um das Gespräch zu starten.',
  en: 'Write the first message to start the conversation.',
  fr: 'Écris le premier message pour lancer la conversation.',
};

import { useChatScrollManager } from '@/features/chat/hooks/use-chat-scroll-manager';
import { useMessageInfiniteScroll } from '@/features/chat/hooks/use-message-infinite-scroll';
import { useMessageReadStatus } from '@/features/chat/hooks/use-message-read-status';
import { formatDayLabel, groupMessagesByDay } from '@/features/chat/utils/message-grouping';

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

  const {
    scrollContainerReference,
    messagesEndReference,
    handleScroll,
    isAtBottom,
    unseenCount,
    scrollToBottom,
  } = useChatScrollManager({
    sortedMessages,
    isFetchingNextPage,
    currentUserId: currentUser,
  });

  if (isLoading || currentUser === undefined || chatDetails === undefined) {
    return (
      <div className="flex h-screen flex-row items-center justify-center bg-gray-50">
        <div className="font-body text-gray-600">{loadingMessagesText[locale]}</div>
      </div>
    );
  }

  const messageDays = groupMessagesByDay(sortedMessages);

  return (
    <div className="relative h-full">
      <div
        ref={scrollContainerReference}
        onScroll={handleScroll}
        className={cn('flex h-full flex-col overflow-x-hidden overflow-y-auto bg-gray-50')}
      >
        {!isThread && <div className="flex-1" />}
        <div className={cn('px-2', isThread ? 'py-1' : 'py-4')}>
          {/* Load more sentinel */}
          <div ref={topSentinelReference} className="h-1 w-full opacity-0" aria-hidden="true" />

          {isFetchingNextPage && (
            <div className="flex w-full justify-center py-2">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          )}

          {!isThread && sortedMessages.length === 0 && (
            <div className="font-body flex flex-col items-center gap-2 px-6 py-12 text-center text-gray-500">
              <MessagesSquare className="h-10 w-10 text-gray-300" aria-hidden="true" />
              <span className="font-semibold text-gray-700">{emptyChatTitleText[locale]}</span>
              <span className="text-sm text-balance">{emptyChatHintText[locale]}</span>
            </div>
          )}

          {messageDays.map((day) => (
            // each day is the containing block of its divider, so the divider sticks while
            // that day is on screen and hands over to the next one
            <section key={day.dayKey} className={isThread ? 'pb-2' : 'pb-4'}>
              <div
                className={cn(
                  'pointer-events-none sticky top-2 z-20 flex justify-center',
                  isThread ? 'my-2' : 'my-4',
                )}
              >
                <h3 className="font-body rounded-full bg-white px-3 py-1 text-[11px] font-semibold tracking-wider text-gray-500 uppercase shadow-sm ring-1 ring-gray-200 backdrop-blur-sm">
                  {formatDayLabel(day.date, locale)}
                </h3>
              </div>
              {day.messages.map(({ message, isFirstInGroup, isLastInGroup }) => {
                const isThreadRoot =
                  typeof parentMessage?.id === 'string' && parentMessage.id === message.id;
                return (
                  <div key={message.id} className={isFirstInGroup ? 'mt-3' : 'mt-0.5'}>
                    <MessageComponent
                      message={message}
                      isCurrentUser={message.senderId === currentUser}
                      chatType={chatDetails.type}
                      hideReplyCount={hideReplyCount}
                      isThreadRoot={isThreadRoot}
                      isFirstInGroup={isFirstInGroup}
                      isLastInGroup={isLastInGroup}
                      locale={locale}
                    />
                  </div>
                );
              })}
            </section>
          ))}
          <div ref={messagesEndReference} />
        </div>
      </div>

      {!isAtBottom && (
        <button
          type="button"
          onClick={scrollToBottom}
          aria-label={jumpToLatestText[locale]}
          className={cn(
            'font-body animate-in fade-in zoom-in-95 absolute right-3 bottom-3 z-30 flex h-10 cursor-pointer items-center gap-1.5 rounded-full bg-white text-sm font-semibold text-gray-700 shadow-md ring-1 ring-gray-200 duration-150',
            unseenCount > 0 ? 'text-cevi-blue px-4' : 'w-10 justify-center',
          )}
        >
          {unseenCount > 0 && (
            <span aria-live="polite">{newMessagesText(unseenCount, locale)}</span>
          )}
          <ArrowDown className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
};
