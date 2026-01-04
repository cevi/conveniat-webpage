'use client';

import { Button } from '@/components/ui/buttons/button';
import { MessageInfoDropdown } from '@/features/chat/components/chat-view/message/message-info-dropdown';
import { useChatActions } from '@/features/chat/context/chat-actions-context';
import { trpc } from '@/trpc/client';
import { Info, MessageSquare, Quote, X } from 'lucide-react';
import React from 'react';

export const ChatSelectionHeader: React.FC = () => {
  const { selectedMessage, setSelectedMessage, quoteMessage, replyInThread } = useChatActions();
  const [showInfo, setShowInfo] = React.useState(false);
  const { data: currentUserId } = trpc.chat.user.useQuery({});

  if (!selectedMessage) return;

  const handleCancelSelection = (): void => {
    setSelectedMessage(undefined);
  };

  const handleQuote = (): void => {
    quoteMessage(selectedMessage.id);
    setSelectedMessage(undefined);
  };

  const handleThread = (): void => {
    replyInThread(selectedMessage.id);
    setSelectedMessage(undefined);
  };

  return (
    <div className="animate-in slide-in-from-top flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 shadow-md duration-200">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleCancelSelection}
          className="hover:bg-gray-100"
        >
          <X className="h-5 w-5 text-gray-700" />
        </Button>
        <span className="text-lg font-bold text-gray-900">1</span>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleQuote}
          title="Quote"
          className="hover:bg-gray-100"
        >
          <Quote className="h-5 w-5 text-gray-700" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleThread}
          title="Reply in thread"
          className="hover:bg-gray-100"
        >
          <MessageSquare className="h-5 w-5 text-gray-700" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowInfo(true)}
          title="Message info"
          className="hover:bg-gray-100"
        >
          <Info className="h-5 w-5 text-gray-700" />
        </Button>
      </div>

      {showInfo && (
        <MessageInfoDropdown
          message={selectedMessage}
          isCurrentUser={selectedMessage.senderId === currentUserId}
          onClose={() => {
            setShowInfo(false);
            setSelectedMessage(undefined);
          }}
        />
      )}
    </div>
  );
};
