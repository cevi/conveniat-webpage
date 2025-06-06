'use client';
import { Button } from '@/components/ui/buttons/button';
import { ChatHeader } from '@/features/chat/components/single-chat-view/chat-header';
import { MessageInput } from '@/features/chat/components/single-chat-view/message-input';
import { MessageList } from '@/features/chat/components/single-chat-view/message-list';
import { useChatDetail } from '@/features/chat/hooks/use-chats';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type React from 'react';

export interface ChatInterface {
  chatId: string;
}

export const ChatClientComponent: React.FC<ChatInterface> = ({ chatId }) => {
  const { data: chatDetail, isLoading } = useChatDetail(chatId);

  if (isLoading) {
    return <ChatSkeleton />;
  }

  if (!chatDetail) {
    return <div className="flex h-full items-center justify-center">Chat not found</div>;
  }

  return (
    <div className="fixed top-0 z-[500] flex h-dvh w-screen flex-col overflow-y-hidden bg-white">
      <ChatHeader chatDetails={chatDetail} />
      <div className="flex-1 overflow-y-auto">
        <MessageList chatDetails={chatDetail} />
      </div>
      <div className="border-t border-gray-200 p-4">
        <MessageInput chatId={chatId} />
      </div>
    </div>
  );
};

const ChatSkeleton: React.FC = () => (
  <div className="fixed top-0 z-[500] flex h-dvh w-screen flex-col bg-white">
    <div className="flex h-[62px] items-center gap-2 border-b-2 border-gray-200 px-4 dark:border-gray-700">
      <Link href="/app/chat">
        <Button variant="ghost" size="icon" className="mr-2">
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </Link>
      <div className="h-8 w-48 bg-gray-50" />
      <div className="ml-auto">
        <div className="h-8 w-8 rounded-full bg-gray-50" />
      </div>
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
