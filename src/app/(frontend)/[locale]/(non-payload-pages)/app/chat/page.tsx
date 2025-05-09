import { ChatsOverviewComponent } from '@/features/chat/components/chat-overview/chats-overview-component';
import type React from 'react';

const ChatPage: React.FC = async () => {
  // wait 20 seconds to simulate loading
  await new Promise((resolve) => setTimeout(resolve, 20_000));

  return <ChatsOverviewComponent />;
};

export default ChatPage;
