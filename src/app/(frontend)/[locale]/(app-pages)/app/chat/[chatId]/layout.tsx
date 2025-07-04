import { ChatIdProvider } from '@/features/chat/context/chat-id-context';
import type React from 'react';
import type { ReactNode } from 'react';

interface ChatPageProperties {
  params: Promise<{
    chatId: string;
  }>;
  children: ReactNode;
}

const ChatPageLayout: React.FC<ChatPageProperties> = async ({ params, children }) => {
  const { chatId } = await params;

  return <ChatIdProvider chatId={chatId}>{children}</ChatIdProvider>;
};

export default ChatPageLayout;
