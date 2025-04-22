import { HeadlineH1 } from '@/components/ui/typography/headline-h1';
import { ChatsOverviewClientComponent } from '@/features/chat/components/chat-overview/chats-overview-client-component';
import React from 'react';

export const ChatsOverviewComponent: React.FC = async () => {
  return (
    <div className="flex h-full flex-col">
      <HeadlineH1 className="text-center">Chats</HeadlineH1>

      <div className="flex-grow overflow-y-auto">
        <ChatsOverviewClientComponent />
      </div>
    </div>
  );
};
