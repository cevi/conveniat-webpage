import { MessageComponent } from '@/features/chat/components/message';
import { useChatUser } from '@/features/chat/hooks/use-chat-user';
import type { ChatDetail } from '@/features/chat/types/chat';
import type React from 'react';

export const MessageList: React.FC<{ chatDetails: ChatDetail }> = ({ chatDetails }) => {
  // Sort messages by timestamp
  const messages = chatDetails.messages;
  const sortedMessages = [...messages].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  const { user: currentUser } = useChatUser();

  if (currentUser === undefined) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-4">
      {sortedMessages.map((message) => (
        <MessageComponent
          key={message.id}
          message={message}
          isCurrentUser={message.senderId === currentUser}
        />
      ))}
    </div>
  );
};
