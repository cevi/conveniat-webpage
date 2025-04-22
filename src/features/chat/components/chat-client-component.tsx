'use client';
import { sendMessage } from '@/features/chat/api/send-message';
import { ChatHeader } from '@/features/chat/components/chat-header';
import { MessageInput } from '@/features/chat/components/message-input';
import { MessageList } from '@/features/chat/components/message-list';
import { useChatDetail } from '@/features/chat/hooks/use-chats';
import React, { useState } from 'react';

export interface ChatInterface {
  chatId: string;
}

export const ChatInterface: React.FC<ChatInterface> = ({ chatId }) => {
  const { chatDetail, loading: isLoading } = useChatDetail(chatId);
  const [newMessage, setNewMessage] = useState('');

  const handleSendMessage = async (message: string): Promise<void> => {
    setNewMessage('');
    await sendMessage({
      chatId: chatId,
      content: message,
      timestamp: new Date(),
    });
  };

  if (isLoading) {
    return <ChatSkeleton />;
  }

  if (!chatDetail) {
    return <div className="flex h-full items-center justify-center">Chat not found</div>;
  }

  return (
    <div className="flex h-full flex-col">
      <ChatHeader name={chatDetail.name} />
      <div className="flex-1 overflow-y-auto p-4">
        <MessageList chatDetails={chatDetail} />
      </div>
      <div className="border-t border-gray-200 p-4">
        <MessageInput value={newMessage} onChange={setNewMessage} onSend={handleSendMessage} />
      </div>
    </div>
  );
};

const ChatSkeleton: React.FC = () => (
  <div className="flex h-full flex-col">
    <div className="border-b border-gray-200 p-4">
      <div className="h-8 w-48 bg-gray-50" />
    </div>
    <div className="flex-1 space-y-4 overflow-y-auto p-4">
      {Array.from({ length: 5 })
        .fill(0)
        .map((_, index) => (
          <div key={index} className={`flex ${index % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
            <div className={`h-16 ${index % 2 === 0 ? 'w-64' : 'w-48'} rounded-lg bg-gray-50`} />
          </div>
        ))}
    </div>
    <div className="border-t border-gray-200 p-4 dark:border-gray-700">
      <div className="h-12 w-full rounded-full bg-gray-50" />
    </div>
  </div>
);
