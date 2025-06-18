import { ChatClientComponent } from '@/features/chat/components/chat-view/chat-client-component';
import { ChatIdProvider } from '@/features/chat/context/chat-id-context';
import type React from 'react';

interface ChatPageProperties {
  params: Promise<{
    chatId: string;
  }>;
}

const ChatPage: React.FC<ChatPageProperties> = async ({ params }) => {
  const { chatId } = await params;

  return (
    <ChatIdProvider chatId={chatId}>
      <ChatClientComponent />
    </ChatIdProvider>
  );
};

export default ChatPage;
