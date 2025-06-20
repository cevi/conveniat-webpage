import { ChatsOverviewClientComponent } from '@/features/chat/components/chat-overview-view/chats-overview-client-component';
import type React from 'react';

const ChatPage: React.FC = async () => {
  return (
    <div className="mt-12 mb-auto flex h-full flex-col">
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <ChatsOverviewClientComponent />
      </div>
    </div>
  );
};

export default ChatPage;
