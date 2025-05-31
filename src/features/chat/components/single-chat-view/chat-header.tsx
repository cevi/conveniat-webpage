'use client';

import type React from 'react';
import { useState } from 'react';

import { Button } from '@/components/ui/buttons/button';
import { ChatDetails } from '@/features/chat/components/single-chat-view/chat-details';
import type { ChatDetail } from '@/features/chat/types/chat';
import { ArrowLeft, Info } from 'lucide-react';
import Link from 'next/link';

interface ChatHeaderProperties {
  chatDetails: ChatDetail;
}

export const ChatHeader: React.FC<ChatHeaderProperties> = ({ chatDetails }) => {
  const [showDetails, setShowDetails] = useState(false);

  // Find the first online participant for status display
  const onlineParticipant = chatDetails.participants.find((p) => p.isOnline);
  const isGroupChat = chatDetails.participants.length > 2;

  return (
    <>
      <div className="flex h-[62px] items-center justify-between border-b-2 border-gray-200 px-4 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <Link href="/app/chat">
            <Button variant="ghost" size="icon" className="mr-1">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>

          <div>
            <h1 className="text-xl font-semibold">{chatDetails.name}</h1>
            {!isGroupChat && onlineParticipant && <p className="text-xs text-green-500">Online</p>}
            {isGroupChat && (
              <p className="text-xs text-gray-500">
                {chatDetails.participants.length} participants
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={() => setShowDetails(true)}>
            <Info className="h-5 w-5" />
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
