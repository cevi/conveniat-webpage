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
    <div className="fixed top-(--app-content-top) left-(--app-content-left) z-30 flex h-[calc(100dvh-var(--app-content-top))] w-[calc(100dvw-var(--app-content-left))] flex-col overflow-y-hidden bg-[#f8fafc]">
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <ChatsOverviewSkeleton />
      </div>
    </div>
  );
}
