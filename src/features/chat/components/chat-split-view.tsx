'use client';

import { ChatIdProvider } from '@/features/chat/context/chat-id-context';
import { cn } from '@/utils/tailwindcss-override';
import { usePathname } from 'next/navigation';
import type React from 'react';
import type { ReactNode } from 'react';

/** `/[locale]/[design]/app/chat`, the overview itself rather than a chat or a step under it. */
const OVERVIEW_PATHNAME = /\/app\/chat\/?$/;

/**
 * The chats screen. A phone shows the list or the open chat; a desktop shows the list on the left
 * and next to it the chat, the new chat or a hint to pick one, the way WhatsApp Web does. The list
 * stays mounted while the user moves between chats, so it keeps its search and filter.
 */
export const ChatSplitView: React.FC<{ list: ReactNode; children: ReactNode }> = ({
  list,
  children,
}) => {
  const isOverview = OVERVIEW_PATHNAME.test(usePathname());

  return (
    <div className="xl:flex xl:h-[calc(100dvh-var(--app-content-top)-var(--app-tab-bar-height))]">
      {/* The screen is white like the design, so the grey search contrasts, from the header
          down to the tab bar however few chats there are. The bottom room keeps the last row
          clear of the tab bar and the "Neuer Chat" button on a phone. */}
      <div
        className={cn(
          'xl:border-line min-h-[calc(100dvh-var(--app-content-top))] bg-white xl:block xl:min-h-0 xl:w-[400px] xl:shrink-0 xl:overflow-y-auto xl:border-r',
          !isOverview && 'hidden',
        )}
      >
        <div className="container mx-auto px-4 pt-4 pb-[168px] sm:px-6 md:px-8 xl:flex xl:min-h-full xl:flex-col xl:px-4 xl:pb-4">
          <div className="mx-auto w-full max-w-2xl xl:flex xl:flex-1 xl:flex-col">
            <ChatIdProvider>{list}</ChatIdProvider>
          </div>
        </div>
      </div>
      <div className="xl:relative xl:min-w-0 xl:flex-1">{children}</div>
    </div>
  );
};
