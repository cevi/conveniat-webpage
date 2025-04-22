import { MessageComponent } from '@/features/chat/components/message';
import type { ChatDetail } from '@/features/chat/types/chat';
import { useSession } from 'next-auth/react';
import type React from 'react';

export const MessageList: React.FC<{ chatDetails: ChatDetail }> = ({ chatDetails }) => {
  const { data } = useSession();
  const user = data?.user;

  if (!user) {
    return <div>No messages available. Please log in.</div>;
  }

  // Sort messages by timestamp
  const messages = chatDetails.messages;
  const sortedMessages = [...messages].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  return (
    <div className="space-y-4">
      {sortedMessages.map((message) => (
        <MessageComponent
          key={message.id}
          message={message}
          isCurrentUser={message.senderId === user.cevi_db_uuid}
        />
      ))}
    </div>
  );
};
