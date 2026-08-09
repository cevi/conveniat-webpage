import { ChatsOverviewSkeleton } from '@/features/chat/components/chat-overview-view/chats-overview-skeleton';
import type React from 'react';

/**
 * Skeleton loading component for the Chat overview page.
 * Shows chat list placeholders.
 *
 * Only reached on a cold navigation: once the (static) chat shell is in the
 * router cache the overview renders the cached chats right away.
 */
export default function ChatLoading(): React.ReactNode {
  return (
    <div className="fixed top-[62px] left-0 z-30 flex h-[calc(100dvh-62px-0px)] w-full flex-col overflow-y-hidden bg-[#f8fafc] xl:left-[480px] xl:w-[calc(100dvw-480px)]">
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <ChatsOverviewSkeleton />
      </div>
    </div>
  );
}
