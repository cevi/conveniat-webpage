'use client';

import { ChatListManager } from '@/features/payload-cms/components/chat-manager/chat-list-manager';
import { TRPCProvider } from '@/trpc/client';
import React from 'react';

/**
 * The list of all chats with their capabilities, shown as a ui field of the
 * `all-chats-management` global so the global's own settings can sit next to it.
 */
const ChatListManagerField: React.FC = () => {
  return (
    <TRPCProvider>
      <div className="bg-background text-foreground">
        <ChatListManager />
      </div>
    </TRPCProvider>
  );
};

export default ChatListManagerField;
