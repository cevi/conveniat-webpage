import { ChatComponent } from '@/features/chat/components/chat-component';
import type React from 'react';

interface ChatPageProperties {
  params: Promise<{
    chatId: string;
  }>;
}

const ChatPage: React.FC<ChatPageProperties> = async ({ params }) => {
  const { chatId } = await params;
  return <ChatComponent chatId={chatId} />;
};

export default ChatPage;
