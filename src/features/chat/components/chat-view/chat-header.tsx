'use client';

import type React from 'react';
import { useState } from 'react';

import { Button } from '@/components/ui/buttons/button';
import { ChatDetails } from '@/features/chat/components/chat-view/chat-details';
import { useChatId } from '@/features/chat/context/chat-id-context';
import { useChatDetail } from '@/features/chat/hooks/use-chats';
import { ArrowLeft, Info } from 'lucide-react';
import Link from 'next/link';

export const ChatHeaderSkeleton: React.FC = () => (
  <div className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 shadow-sm">
    <Link href="/app/chat">
      <Button variant="ghost" size="icon" className="mr-1 hover:bg-gray-100">
        <ArrowLeft className="h-5 w-5 text-gray-700" />
      </Button>
    </Link>
    <div className="h-6 w-48 animate-pulse rounded bg-gray-200" />
  </div>
);

export const ChatHeader: React.FC = () => {
  const chatId = useChatId();
  const { data: chatDetails } = useChatDetail(chatId);
  const [showDetails, setShowDetails] = useState(false);

  if (!chatDetails) {
    return <ChatHeaderSkeleton />;
  }

  // Find the first online participant for status display
  const onlineParticipant = chatDetails.participants.find((p) => p.isOnline);
  const isGroupChat = chatDetails.participants.length > 2;

  return (
    <>
      <div className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/app/chat">
            <Button variant="ghost" size="icon" className="mr-1 hover:bg-gray-100">
              <ArrowLeft className="h-5 w-5 text-gray-700" />
            </Button>
          </Link>

          <div>
            <h1 className="font-heading text-lg font-semibold text-gray-900">{chatDetails.name}</h1>
            {!isGroupChat && onlineParticipant && (
              <p className="font-body text-xs text-green-600">Online</p>
            )}
            {isGroupChat && (
              <p className="font-body text-xs text-gray-500">
                {chatDetails.participants.length} participants
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowDetails(true)}
            className="hover:bg-gray-100"
          >
            <Info className="h-5 w-5 text-gray-700" />
          </Button>
        </div>
      </div>

      <ChatDetails
        chatDetails={chatDetails}
        isOpen={showDetails}
        onClose={() => setShowDetails(false)}
      />
    </>
  );
};
