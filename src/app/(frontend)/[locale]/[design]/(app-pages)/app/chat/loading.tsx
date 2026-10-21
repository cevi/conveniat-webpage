import { SetHeaderActions } from '@/components/header/header-actions';
import { QrCodeIconSkeleton } from '@/features/chat/components/chat-overview-view/chat-qr-code-button';
import {
  ChatsOverviewSkeleton,
  NewChatButtonSkeleton,
} from '@/features/chat/components/chat-overview-view/chats-overview-skeleton';
import type React from 'react';

/**
 * The chat overview while it loads, in the page's own layout: the "Mein Code" pill, the
 * search, the rows and the floating "Neuer Chat".
 *
 * Only reached on a cold navigation: once the (static) chat shell is in the
 * router cache the overview renders the cached chats right away.
 */
export default function ChatLoading(): React.ReactNode {
  return (
    <article className="container mx-auto min-h-full bg-white px-4 pt-4 pb-[168px] sm:px-6 md:px-8">
      <SetHeaderActions>
        <QrCodeIconSkeleton />
      </SetHeaderActions>
      <div className="mx-auto w-full max-w-2xl">
        <ChatsOverviewSkeleton />
      </div>
      <NewChatButtonSkeleton />
    </article>
  );
}
