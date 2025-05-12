import { HeadlineH1 } from '@/components/ui/typography/headline-h1';
import { ChatsOverviewClientComponent } from '@/features/chat/components/chat-overview-view/chats-overview-client-component';
import { CreateNewChatClientComponent } from '@/features/chat/components/chat-overview-view/new-chat-client-component';
import React, { Suspense } from 'react';

export const ChatsOverviewComponent: React.FC = async () => {
  return (
    <div className="flex h-full flex-col">
      <HeadlineH1 className="text-center">Chats</HeadlineH1>

      <div className="flex-grow overflow-y-auto">
        <Suspense
          fallback={<div className="flex h-full items-center justify-center">Loading...</div>}
        >
          <ChatsOverviewClientComponent />
        </Suspense>
      </div>

      <div>
        <Suspense
          fallback={<div className="flex h-full items-center justify-center">Loading...</div>}
        >
          <CreateNewChatClientComponent />
        </Suspense>
      </div>
    </div>
  );
};
