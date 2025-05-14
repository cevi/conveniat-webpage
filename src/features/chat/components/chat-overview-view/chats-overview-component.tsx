import { HeadlineH1 } from '@/components/ui/typography/headline-h1';
import { ChatsOverviewClientComponent } from '@/features/chat/components/chat-overview-view/chats-overview-client-component';
import type React from 'react';
import { Suspense } from 'react';

export const ChatsOverviewComponent: React.FC = async () => {
  return (
    <div className="flex h-full flex-col">
      <HeadlineH1 className="mb-6 text-center">Chats</HeadlineH1>

      <div className="grow overflow-y-auto px-4">
        <Suspense
          fallback={
            <div className="flex h-full items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div>
            </div>
          }
        >
          <ChatsOverviewClientComponent />
        </Suspense>
      </div>
    </div>
  );
};
