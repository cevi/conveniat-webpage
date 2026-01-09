'use client';

import { ChatListManager } from '@/features/payload-cms/components/chat-manager/chat-list-manager';
import { TRPCProvider } from '@/trpc/client';
import React from 'react';

/**
 * Wrapper view for the chat capability management interface.
 *
 * Renders the chat list management UI within the tRPC provider context,
 * providing the necessary data layer for managing chat capabilities.
 */
const AllChatsManagementView: React.FC = () => {
  return (
    <TRPCProvider>
      <div className="bg-background text-foreground min-h-screen">
        <ChatListManager />
      </div>
    </TRPCProvider>
  );
};

export default AllChatsManagementView;
