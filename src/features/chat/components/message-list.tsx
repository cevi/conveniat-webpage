'use client';
import { MessageComponent } from '@/features/chat/components/message';
import { useChatUser } from '@/features/chat/hooks/use-chat-user';
import type { ChatDetail } from '@/features/chat/types/chat';
import type React from 'react';
import { useEffect, useRef } from 'react';

export const MessageList: React.FC<{ chatDetails: ChatDetail }> = ({ chatDetails }) => {
  const messages = chatDetails.messages;
  const sortedMessages = [...messages].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  const { data: currentUser } = useChatUser();
  const messagesEndReference = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndReference.current?.scrollIntoView({ behavior: 'instant' });
  }, [sortedMessages]);

  if (currentUser === undefined) {
    return <div className="flex flex-row h-screen justify-center items-center">Loading...</div>;
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="flex-1" />
      <div className="space-y-4 px-4 py-3">
        {sortedMessages.map((message) => (
          <MessageComponent
            key={message.id}
            message={message}
            isCurrentUser={message.senderId === currentUser}
          />
        ))}
        <div ref={messagesEndReference} />
      </div>
    </div>
  );
};
