'use client';
import { Button } from '@/components/ui/buttons/button';
import { sendMessage } from '@/features/chat/api/send-message';
import { ChatHeader } from '@/features/chat/components/chat-header';
import { MessageInput } from '@/features/chat/components/message-input';
import { MessageList } from '@/features/chat/components/message-list';
import { useChatDetail } from '@/features/chat/hooks/use-chats';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
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
    <div className="flex flex-col bg-white z-[500] h-dvh fixed top-0 w-screen overflow-y-hidden">
      <ChatHeader name={chatDetail.name} />
      <div className="flex-1 overflow-y-auto">
        <MessageList chatDetails={chatDetail} />
      </div>
      <div className="border-t border-gray-200 p-4">
        <MessageInput value={newMessage} onChange={setNewMessage} onSend={handleSendMessage} />
      </div>
    </div>
  );
};

const ChatSkeleton: React.FC = () => (
  <div className="flex flex-col bg-white z-[500] h-dvh fixed top-0 w-screen">
    <div className="flex items-center gap-2 border-b-2 border-gray-200  h-[62px] px-4 dark:border-gray-700">
      <Link href="/app/chat">
        <Button variant="ghost" size="icon" className="mr-2">
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </Link>
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
