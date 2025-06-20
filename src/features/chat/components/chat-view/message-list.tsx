'use client';
import { changeMessageStatus } from '@/features/chat/api/change-message-status';
import { MessageComponent } from '@/features/chat/components/chat-view/message';
import { useChatId } from '@/features/chat/context/chat-id-context';
import { useChatUser } from '@/features/chat/hooks/use-chat-user';
import { useChatDetail } from '@/features/chat/hooks/use-chats';
import { MessageStatusDto } from '@/features/chat/types/api-dto-types';
import React, { useEffect, useRef } from 'react';

export const MessageList: React.FC = () => {
  const chatId = useChatId();
  const { data: chatDetails, isLoading } = useChatDetail(chatId);
  const { data: currentUser } = useChatUser();
  const messagesEndReference = useRef<HTMLDivElement>(null);

  const messages = chatDetails?.messages ?? [];
  const sortedMessages = [...messages].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  useEffect(() => {
    messagesEndReference.current?.scrollIntoView({ behavior: 'instant' });
  }, [sortedMessages]);

  useEffect(() => {
    if (currentUser !== undefined && sortedMessages.length > 0) {
      for (const message of sortedMessages) {
        if (message.senderId === currentUser) continue;
        if (message.status !== MessageStatusDto.READ) {
          changeMessageStatus({
            messageId: message.id,
            status: MessageStatusDto.READ,
          }).catch(console.error);
        }
      }
    }
  }, [currentUser, sortedMessages]);

  // Handle loading states for both chatDetails and currentUser
  // This early return is fine because all hooks above it are called unconditionally.
  if (isLoading || currentUser === undefined || chatDetails === undefined) {
    return (
      <div className="flex h-screen flex-row items-center justify-center bg-gray-50">
        <div className="font-body text-gray-600">Loading messages...</div>
      </div>
    );
  }

  // Group messages by date - This logic can now safely access chatDetails.messages
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

        <div ref={messagesEndReference} />
      </div>
    </div>
  );
};
