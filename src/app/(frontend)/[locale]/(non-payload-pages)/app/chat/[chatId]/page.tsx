import { ChatClientComponent } from '@/features/chat/components/single-chat-view/chat-client-component';
import type React from 'react';

interface ChatPageProperties {
  params: Promise<{
    chatId: string;
  }>;
}

const ChatPage: React.FC<ChatPageProperties> = async ({ params }) => {
  const { chatId } = await params;
  return <ChatClientComponent chatId={chatId} />;
};

export default ChatPage;
