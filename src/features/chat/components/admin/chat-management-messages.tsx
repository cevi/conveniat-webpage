import type { ChatMessage } from '@/features/chat/api/types';
import { MessageComponent } from '@/features/chat/components/chat-view/message';
import type { ChatType } from '@/lib/prisma/client';
import { Loader2 } from 'lucide-react';
import React, { useEffect, useRef } from 'react';

interface ChatManagementMessagesProperties {
  messages: ChatMessage[];
  loading: boolean;
  locale: string;
  chatType: ChatType;
}

const loadingMessagesText: Record<string, string> = {
  de: 'Nachrichten werden geladen...',
  en: 'Loading messages...',
  fr: 'Chargement des messages...',
};

const todayText: Record<string, string> = {
  de: 'Heute',
  en: 'Today',
  fr: "Aujourd'hui",
};

export const ChatManagementMessages: React.FC<ChatManagementMessagesProperties> = ({
  messages,
  loading,
  locale,
  chatType,
}) => {
  const messagesEndReference = useRef<HTMLDivElement>(null);

  // Group messages by date
  const messagesByDate: { [date: string]: ChatMessage[] } = {};
  for (const message of messages) {
    const date = new Date(message.createdAt).toLocaleDateString();
    if (!messagesByDate[date]) {
      messagesByDate[date] = [];
    }
    messagesByDate[date].push(message);
  }

  useEffect(() => {
    messagesEndReference.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (loading && messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center space-y-2 opacity-50">
        <Loader2 className="animate-spin" />
        <div className="text-sm">{loadingMessagesText[locale] || loadingMessagesText['en']}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto bg-[var(--theme-bg)] p-4">
      <div className="flex-1" />
      <div className="space-y-6">
        {Object.entries(messagesByDate).map(([date, messagesForDate]) => (
          <div key={date}>
            <div className="my-6 flex justify-center">
              <div className="font-body rounded-full border border-[var(--theme-elevation-200)] bg-[var(--theme-elevation-50)] px-4 py-1 text-xs font-medium text-[var(--theme-text)] opacity-70 shadow-sm">
                {date === new Date().toLocaleDateString()
                  ? todayText[locale] || todayText['en']
                  : date}
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

                const isSenderAdmin = message.senderId !== undefined;

                return (
                  <div
                    key={message.id}
                    className={`admin-chat-message ${isWithin5Min ? 'mt-1' : 'mt-4'}`}
                  >
                    <MessageComponent
                      message={message}
                      isCurrentUser={isSenderAdmin}
                      chatType={chatType}
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
