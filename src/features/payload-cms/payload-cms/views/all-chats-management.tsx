'use client';

import { ChatListManager } from '@/features/payload-cms/components/chat-manager/chat-list-manager';
import { TRPCProvider } from '@/trpc/client';
import React from 'react';

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
