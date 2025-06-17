'use client';
import { MessageComponent } from '@/features/chat/components/single-chat-view/message';
import { TypingIndicator } from '@/features/chat/components/single-chat-view/typing-indicator';
import { useChatUser } from '@/features/chat/hooks/use-chat-user';
import type { ChatDetail } from '@/features/chat/types/chat';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';

export const MessageList: React.FC<{ chatDetails: ChatDetail }> = ({ chatDetails }) => {
  const messages = chatDetails.messages;
  const sortedMessages = [...messages].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  const { data: currentUser } = useChatUser();
  const messagesEndReference = useRef<HTMLDivElement>(null);

  const [typingUser] = useState<string | undefined>('Some Random User');

  useEffect(() => {
    messagesEndReference.current?.scrollIntoView({ behavior: 'instant' });
  }, [sortedMessages, typingUser]);

  if (currentUser === undefined) {
    return (
      <div className="flex h-screen flex-row items-center justify-center bg-gray-50">
        <div className="font-body text-gray-600">Loading...</div>
      </div>
    );
  }

  // Group messages by date
  const messagesByDate: { [date: string]: typeof sortedMessages } = {};
  for (const message of sortedMessages) {
    const date = new Date(message.timestamp).toLocaleDateString();
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
                {date === new Date().toLocaleDateString() ? 'Today' : date}
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

        <TypingIndicator userName={typingUser} />

        <div ref={messagesEndReference} />
      </div>
    </div>
  );
};
