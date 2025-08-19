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

  useEffect(() => {
    messagesEndReference.current?.scrollIntoView({ behavior: 'instant' });
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
    <div className="flex h-full flex-col overflow-y-auto bg-gray-50">
      <div className="flex-1" />
      <div className="space-y-6 px-4 py-4">
        {Object.entries(messagesByDate).map(([date, messagesForDate]) => (
          <div key={date}>
            <div className="my-6 flex justify-center">
              <div className="font-body rounded-full bg-gray-200 px-4 py-2 text-xs font-medium text-gray-600 shadow-sm">
                {date === new Date().toLocaleDateString() ? todayText[locale] : date}
              </div>
            </div>
            <div className="space-y-4">
              {messagesForDate.map((message) => (
                <MessageComponent
                  key={message.id}
                  message={message}
                  isCurrentUser={message.senderId === currentUser}
                />
              ))}
            </div>
          </div>
        ))}

        <div ref={messagesEndReference} />
      </div>
    </div>
  );
};
