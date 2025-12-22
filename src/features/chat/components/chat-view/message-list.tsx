'use client';
import { MessageComponent } from '@/features/chat/components/chat-view/message';
import { useChatId } from '@/features/chat/context/chat-id-context';
import { useChatDetail } from '@/features/chat/hooks/use-chats';
import { MessageEventType } from '@/lib/prisma/client';
import { trpc } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { useCurrentLocale } from 'next-i18n-router/client';
import React, { useEffect, useRef, useState } from 'react';

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

export const MessageList: React.FC = () => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const chatId = useChatId();
  const { mutate: changeMessageStatus } = trpc.chat.messageStatus.useMutation({
    retry: false,
  });
  const { data: chatDetails, isLoading } = useChatDetail(chatId);
  const { data: currentUser } = trpc.chat.user.useQuery({});
  const messagesEndReference = useRef<HTMLDivElement>(null);

  const messages = chatDetails?.messages ?? [];
  // TODO: remove this, as the messages are already sorted in the backend
  const sortedMessages = [...messages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  // Track if this is the initial load and if user is at bottom
  const hasScrolledReference = useRef(false);
  const isAtBottomReference = useRef(true);
  const scrollContainerReference = useRef<HTMLDivElement>(null);

  // Track scroll position to know if user is at bottom
  const handleScroll = (): void => {
    const container = scrollContainerReference.current;
    if (container) {
      const threshold = 100; // pixels from bottom to consider "at bottom"
      isAtBottomReference.current =
        container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
    }
  };

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
      className="flex h-full flex-col overflow-y-auto bg-gray-50"
    >
      <div className="flex-1" />
      <div className="space-y-6 px-2 py-4">
        {Object.entries(messagesByDate).map(([date, messagesForDate]) => (
          <div key={date}>
            <div className="my-6 flex justify-center">
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

                return (
                  <div key={message.id} className={isWithin5Min ? 'mt-1' : 'mt-4'}>
                    <MessageComponent
                      message={message}
                      isCurrentUser={message.senderId === currentUser}
                      chatType={chatDetails.type}
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
