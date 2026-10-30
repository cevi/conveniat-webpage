'use client';
import { EmptyState } from '@/components/ui/empty-state';
import { SectionLabel } from '@/components/ui/section-label';
import { MessageComponent } from '@/features/chat/components/chat-view/message';
import { TypingIndicator } from '@/features/chat/components/chat-view/typing-indicator';
import { useChatId } from '@/features/chat/context/chat-id-context';
import { useChatDetail } from '@/features/chat/hooks/use-chats';
import { describeContactFunktionen } from '@/features/chat/utils/contact-search';
import { useCurrentLocale } from '@/hooks/use-current-locale';
import { trpc } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { ArrowDown, Loader2, MessagesSquare } from 'lucide-react';
import React from 'react';

const loadingMessagesText: StaticTranslationString = {
  de: 'Nachrichten werden geladen...',
  en: 'Loading messages...',
  fr: 'Chargement des messages...',
};

const repliesDividerText = (count: number, locale: Locale): string => {
  if (locale === 'de') return count === 1 ? '1 Antwort' : `${count} Antworten`;
  if (locale === 'fr') return count === 1 ? '1 réponse' : `${count} réponses`;
  return count === 1 ? '1 reply' : `${count} replies`;
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
import { useTypists } from '@/features/chat/hooks/use-typing';
import {
  formatDayLabel,
  groupMessagesByDay,
  MESSAGE_GROUP_WINDOW_MS,
} from '@/features/chat/utils/message-grouping';
import type { Typist } from '@/features/chat/utils/typing-store';

export const MessageList: React.FC<{
  parentId?: string;
  hideReplyCount?: boolean;
  isThread?: boolean;
  /** Above the replies of a thread: the message they answer, see `ThreadView`. */
  threadHeader?: React.ReactNode;
}> = ({ parentId, hideReplyCount = false, isThread = false, threadHeader }) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const chatId = useChatId();
  const { data: chatDetails, isLoading } = useChatDetail(chatId);
  const { data: currentUser } = trpc.chat.user.useQuery({});
  // The messages name their sender only; the functions come with the cached contacts, which
  // the chat sync keeps fresh. Never refetched from here: that is the whole contact list.
  const { data: contacts } = trpc.chat.contacts.useQuery({}, { staleTime: Infinity });
  const funktionenBySender = React.useMemo(
    () =>
      new Map(
        (contacts ?? []).map((contact) => [contact.userId, describeContactFunktionen(contact)]),
      ),
    [contacts],
  );
  const pictureBySender = React.useMemo(
    () =>
      new Map(
        (chatDetails?.participants ?? []).map((participant) => [
          participant.id,
          participant.pictureUrl,
        ]),
      ),
    [chatDetails?.participants],
  );

  const { sortedMessages, isFetchingNextPage, topSentinelReference } = useMessageInfiniteScroll({
    chatId,
    parentId: parentId ?? undefined,
    parentMessage: undefined,
    currentUser,
  });

  // Where the reader stopped, from the server's read state, asked once when the chat opens and
  // never kept: an answer from the cache would put the line where it was days ago.
  const unreadMarker = trpc.chat.getUnreadMarker.useQuery(
    { chatId },
    {
      enabled: !isThread && chatId !== '',
      staleTime: Infinity,
      gcTime: 0,
      retry: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      meta: { persist: false },
    },
  );
  // Decided once, with the first messages and the marker, so the line stays before the same
  // message while new ones come and the reader reads them. Offline the marker fails, and the
  // chat opens without a line.
  const [firstUnread, setFirstUnread] = React.useState<
    { decided: true; message: { id: string; count: number } | undefined } | undefined
  >();
  const isMarkerSettled = isThread || unreadMarker.isFetchedAfterMount || unreadMarker.isError;
  if (
    firstUnread === undefined &&
    isMarkerSettled &&
    sortedMessages.length > 0 &&
    currentUser !== undefined
  ) {
    const markerId = isThread ? undefined : unreadMarker.data?.firstUnreadMessageId;
    setFirstUnread({
      decided: true,
      message:
        markerId === undefined
          ? undefined
          : { id: markerId, count: unreadMarker.data?.unreadCount ?? 0 },
    });
  }
  const unreadDividerReference = React.useRef<HTMLDivElement>(null);

  const messagesById = React.useMemo(
    () => new Map(sortedMessages.map((message) => [message.id, message])),
    [sortedMessages],
  );

  const typists = useTypists(chatId, parentId);

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
    typingCount: typists.length,
    initialAnchorReference: unreadDividerReference,
    isInitialAnchorDecided: firstUnread !== undefined,
  });

  // Reading waits for the line: a receipt that reached the server first would leave nothing
  // unread to mark.
  useMessageReadStatus({
    chatId,
    currentUser,
    sortedMessages,
    isAtBottom: isAtBottom && firstUnread !== undefined,
  });

  if (isLoading || currentUser === undefined || chatDetails === undefined) {
    return (
      <div className="bg-page flex h-full flex-row items-center justify-center">
        <div className="text-[15px] text-green-700">{loadingMessagesText[locale]}</div>
      </div>
    );
  }

  const messageDays = groupMessagesByDay(sortedMessages);

  // Dots sit inside the last day, exactly where the typist's message will be inserted, so
  // the message replaces them without moving anything.
  const lastMessage = sortedMessages.at(-1);
  // the dots join the typist's block the same way their message will
  const continuesBlock = (typist: Typist): boolean =>
    lastMessage?.senderId === typist.userId &&
    typist.since - new Date(lastMessage.createdAt).getTime() < MESSAGE_GROUP_WINDOW_MS;
  // ...and take over the block's end (time, tail, avatar) now rather than when they land
  const isLastMessageContinued = typists.some((typist) => continuesBlock(typist));
  const isGroupChat = chatDetails.type === 'GROUP';

  const typingIndicators = typists.map((typist) => {
    return (
      <div key={typist.userId} className={continuesBlock(typist) ? 'mt-0.5' : 'mt-3'}>
        <TypingIndicator
          typist={typist}
          showName={isGroupChat && !continuesBlock(typist)}
          showAvatar={isGroupChat}
          pictureUrl={pictureBySender.get(typist.userId)}
          locale={locale}
        />
      </div>
    );
  });

  // a thread on one day needs no day label above its replies
  const showDayLabels = !isThread || messageDays.length > 1;

  return (
    <div className="relative h-full">
      <div
        ref={scrollContainerReference}
        onScroll={handleScroll}
        className="bg-page flex h-full flex-col overflow-x-hidden overflow-y-auto"
      >
        {threadHeader}
        {isThread && (
          <div className="flex items-center gap-3 px-4 pt-4 pb-1">
            <SectionLabel as="h3">{repliesDividerText(sortedMessages.length, locale)}</SectionLabel>
            <div className="bg-line h-px flex-1" aria-hidden="true" />
          </div>
        )}
        {!isThread && <div className="flex-1" />}
        <div className={cn('px-2', isThread ? 'py-1' : 'py-4')}>
          {/* Load more sentinel */}
          <div ref={topSentinelReference} className="h-1 w-full opacity-0" aria-hidden="true" />

          {isFetchingNextPage && (
            <div className="flex w-full justify-center py-2">
              <Loader2 className="h-6 w-6 animate-spin text-green-500" aria-hidden="true" />
            </div>
          )}

          {!isThread && sortedMessages.length === 0 && (
            <EmptyState
              icon={MessagesSquare}
              title={emptyChatTitleText[locale]}
              description={emptyChatHintText[locale]}
              className="mx-2 my-6"
            />
          )}

          {messageDays.map((day) => (
            // each day is the containing block of its divider, so the divider sticks while
            // that day is on screen and hands over to the next one
            <section key={day.dayKey} className={isThread ? 'pb-2' : 'pb-4'}>
              {/* a band in the list colour, not a lone pill: messages scroll out of sight
                  under it instead of showing their text on both sides of the day */}
              {showDayLabels && (
                <div
                  className={cn(
                    'bg-page pointer-events-none sticky top-0 z-20 -mx-2 flex justify-center',
                    isThread ? 'py-2' : 'py-3',
                  )}
                >
                  <h3 className="border-line rounded-full border bg-white px-3 py-1 text-[13px] font-semibold text-green-900">
                    {formatDayLabel(day.date, locale)}
                  </h3>
                </div>
              )}
              {day.messages.map(({ message, isFirstInGroup, isLastInGroup }) => {
                const payload = message.messagePayload as Record<string, unknown> | null;
                const quotedId =
                  typeof payload?.['quotedMessageId'] === 'string'
                    ? payload['quotedMessageId']
                    : undefined;
                return (
                  // 12 px between runs, 2 px inside one
                  <div key={message.id} className={isFirstInGroup ? 'mt-3' : 'mt-0.5'}>
                    {firstUnread?.message?.id === message.id && (
                      <div
                        ref={unreadDividerReference}
                        className="-mx-2 mb-1 flex items-center gap-3 px-4 pt-1 pb-2"
                      >
                        <div className="bg-line h-px flex-1" aria-hidden="true" />
                        <span className="text-[13px] font-semibold text-green-700">
                          {newMessagesText(firstUnread.message.count, locale)}
                        </span>
                        <div className="bg-line h-px flex-1" aria-hidden="true" />
                      </div>
                    )}
                    <MessageComponent
                      message={message}
                      isCurrentUser={message.senderId === currentUser}
                      senderFunktionen={funktionenBySender.get(message.senderId ?? '') ?? ''}
                      senderPictureUrl={pictureBySender.get(message.senderId ?? '')}
                      chatType={chatDetails.type}
                      hideReplyCount={hideReplyCount}
                      quotedMessage={
                        quotedId === undefined ? undefined : messagesById.get(quotedId)
                      }
                      isFirstInGroup={isFirstInGroup}
                      isLastInGroup={
                        isLastInGroup && !(isLastMessageContinued && message.id === lastMessage?.id)
                      }
                      locale={locale}
                    />
                  </div>
                );
              })}
              {day === messageDays.at(-1) && typingIndicators}
            </section>
          ))}
          {messageDays.length === 0 && typingIndicators}
          <div ref={messagesEndReference} />
        </div>
      </div>

      {/* clear of the composer at the right, with the count of what arrived meanwhile */}
      {!isAtBottom && (
        <button
          type="button"
          onClick={scrollToBottom}
          aria-label={
            unseenCount > 0
              ? `${jumpToLatestText[locale]}, ${newMessagesText(unseenCount, locale)}`
              : jumpToLatestText[locale]
          }
          className="animate-in fade-in zoom-in-95 border-line hover:bg-quiet absolute right-3 bottom-3 z-30 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border bg-white text-green-900 shadow-md duration-150"
        >
          <ArrowDown className="h-5 w-5" aria-hidden="true" />
          {unseenCount > 0 && (
            <span
              aria-live="polite"
              className="bg-conveniat-green absolute -top-1.5 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-bold text-white tabular-nums"
            >
              {unseenCount > 99 ? '99+' : unseenCount}
            </span>
          )}
        </button>
      )}
    </div>
  );
};
