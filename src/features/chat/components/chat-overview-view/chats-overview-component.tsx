import { HeadlineH1 } from '@/components/ui/typography/headline-h1';
import { ChatsOverviewClientComponent } from '@/features/chat/components/chat-overview-view/chats-overview-client-component';
import type React from 'react';

export const ChatsOverviewComponent: React.FC = async () => {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-gray-200 bg-white px-6 py-4 shadow-sm">
        <HeadlineH1 className="font-heading text-center text-2xl font-bold text-gray-900">
          Messages
        </HeadlineH1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <ChatsOverviewClientComponent />
      </div>
    </div>
  );
};
