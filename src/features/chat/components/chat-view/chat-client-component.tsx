'use client';
import { Button } from '@/components/ui/buttons/button';
import { ChatHeader, ChatHeaderSkeleton } from '@/features/chat/components/chat-view/chat-header';
import { MessageInput } from '@/features/chat/components/chat-view/message-input';
import { MessageList } from '@/features/chat/components/chat-view/message-list';
import { useChatId } from '@/features/chat/context/chat-id-context';
import { useChatDetail } from '@/features/chat/hooks/use-chats';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import React from 'react';

/**
 * Message displayed if the user is offline and tries to access a chat.
 * And the chat is not cached.
 *
 * @constructor
 */
const ChatOfflineMessage: React.FC = () => (
  <div className="fixed top-0 z-[500] flex h-dvh w-screen flex-col overflow-y-hidden bg-gray-50 xl:top-[62px] xl:left-[480px] xl:h-[calc(100dvh-62px)] xl:w-[calc(100dvw-480px)]">
    <ChatHeaderSkeleton />
    <div className="flex flex-1 items-center justify-center p-4 text-center text-gray-500">
      <span>
        <b>Your offline.</b>
        <br />
        You need to be online to view this chat.
      </span>
    </div>
  </div>
);

export const ChatErrorMessage: React.FC = () => (
  <div className="fixed top-0 z-[500] flex h-dvh w-screen flex-col overflow-y-hidden bg-gray-50 xl:top-[62px] xl:left-[480px] xl:h-[calc(100dvh-62px)] xl:w-[calc(100dvw-480px)]">
    <ChatHeaderSkeleton />
    <div className="flex flex-1 items-center justify-center p-4 text-center text-red-500">
      <span>
        <b>Error loading chat.</b>
        <br />
        Please try again later.
      </span>
    </div>
  </div>
);

const OfflineBanner: React.FC = () => (
  <div className="z-[500] bg-red-100 p-4 text-center text-red-800">
    <span className="font-semibold">
      You are currently offline. Messages will be sent when you are back online.
    </span>
  </div>
);

export const ChatClientComponent: React.FC = () => {
  const chatId = useChatId();
  const { isLoading, isPaused, isPending, isError, errorUpdateCount } = useChatDetail(chatId);

  if (isLoading && errorUpdateCount === 0) return <ChatSkeleton />;
  if (isPaused && isPending) return <ChatOfflineMessage />;
  if (isError || (isLoading && errorUpdateCount !== 0)) return <ChatErrorMessage />;

  return (
    <div className="fixed top-0 z-[500] flex h-dvh w-screen flex-col overflow-y-hidden bg-gray-50 xl:top-[62px] xl:left-[480px] xl:h-[calc(100dvh-62px)] xl:w-[calc(100dvw-480px)]">
      <ChatHeader />
      {isPaused && <OfflineBanner />}
      <div className="flex-1 overflow-y-auto">
        <MessageList />
      </div>
      <div className="border-t border-gray-200 bg-white p-4">
        <MessageInput />
      </div>
    </div>
  );
};

const ChatSkeleton: React.FC = () => (
  <div className="fixed top-0 z-[500] flex h-dvh w-screen flex-col bg-gray-50 xl:top-[62px] xl:left-[480px] xl:h-[calc(100dvh-62px)] xl:w-[calc(100dvw-480px)]">
    <div className="flex h-16 items-center gap-3 border-b border-gray-200 bg-white px-4 shadow-sm">
      <Link href="/app/chat">
        <Button variant="ghost" size="icon" className="mr-2 hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5 text-gray-700" />
        </Button>
      </Link>
      <div className="h-6 w-48 animate-pulse rounded bg-gray-200" />
      <div className="ml-auto">
        <div className="h-8 w-8 animate-pulse rounded-full bg-gray-200" />
      </div>
    </div>
    <div className="flex-1 space-y-4 overflow-y-auto p-4">
      {Array.from({ length: 5 })
        .fill(0)
        .map((_, index) => (
          <div key={index} className={`flex ${index % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
            <div
              className={`h-16 ${index % 2 === 0 ? 'w-64' : 'w-48'} animate-pulse rounded-2xl bg-gray-200`}
            />
          </div>
        ))}
    </div>
    <div className="border-t border-gray-200 bg-white p-4">
      <div className="h-12 w-full animate-pulse rounded-full bg-gray-200" />
    </div>
  </div>
);
