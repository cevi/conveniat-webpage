import { ChatInterface } from '@/features/chat/components/chat-client-component';
import React from 'react';

interface ChatComponentProperties {
  chatId: string;
}

export const ChatComponent: React.FC<ChatComponentProperties> = async ({ chatId }) => {
  return <ChatInterface chatId={chatId} />;
};
