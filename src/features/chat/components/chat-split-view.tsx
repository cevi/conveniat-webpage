'use client';

import { ChatIdProvider } from '@/features/chat/context/chat-id-context';
import { InAppDesignContext } from '@/features/chat/context/in-app-design-context';
import { ListIsPreviousContext } from '@/features/chat/context/list-is-previous-context';
import { PendingChatDeletionProvider } from '@/features/chat/context/pending-chat-deletion-context';
import { cn } from '@/utils/tailwindcss-override';
import { usePathname } from 'next/navigation';
import type React from 'react';
import type { ReactNode } from 'react';
import { useState } from 'react';

/** `/[locale]/[design]/app/chat`, the overview itself rather than a chat or a step under it. */
const OVERVIEW_PATHNAME = /\/app\/chat\/?$/;

/**
 * The chats screen. A phone shows the list or the open chat; a desktop shows the list on the left
 * and next to it the chat, the new chat or a hint to pick one, the way WhatsApp Web does. The list
 * stays mounted while the user moves between chats, so it keeps its search and filter.
 */
export const ChatSplitView: React.FC<{
  list: ReactNode;
  /** under the list on a desktop, kept in place while the list scrolls */
  listFoot?: ReactNode;
  /** whether the chats are shown in the app; a browser gets the list's foot and other hints */
  inAppDesign: boolean;
  children: ReactNode;
}> = ({ list, listFoot, inAppDesign, children }) => {
  const pathname = usePathname();
  const isOverview = OVERVIEW_PATHNAME.test(pathname);

  // The screen before this one, while the user stays under the chat layout. It starts empty, as
  // whatever came before the layout mounted is not the list.
  const [shownPathname, setShownPathname] = useState(pathname);
  const [previousPathname, setPreviousPathname] = useState<string | undefined>();
  if (pathname !== shownPathname) {
    setPreviousPathname(shownPathname);
    setShownPathname(pathname);
  }
  const isListPrevious = previousPathname !== undefined && OVERVIEW_PATHNAME.test(previousPathname);

  return (
    <InAppDesignContext value={inAppDesign}>
      <ListIsPreviousContext value={isListPrevious}>
        <PendingChatDeletionProvider>
          {/* relative so the overview page's empty box on a phone sits at the top, see NoChatSelected */}
          <div className="relative xl:flex xl:h-[calc(100dvh-var(--app-content-top)-var(--app-tab-bar-height))]">
            {/* The screen is white like the design, so the grey search contrasts, from the header
          down to the tab bar however few chats there are. The bottom room keeps the last row
          clear of the tab bar and the "Neuer Chat" button on a phone. */}
            <div
              className={cn(
                'xl:border-line min-h-[calc(100dvh-var(--app-content-top))] bg-white xl:flex xl:min-h-0 xl:w-[400px] xl:shrink-0 xl:flex-col xl:border-r',
                !isOverview && 'hidden',
              )}
            >
              <ChatIdProvider>
                {/* The column scrolls on its own on a desktop. Without its bounce the search
                    stays put while a pull to refresh moves only the chats, as on a phone. */}
                <div className="xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:overscroll-y-none">
                  <div className="container mx-auto px-4 pt-4 pb-[168px] sm:px-6 md:px-8 xl:flex xl:min-h-full xl:flex-col xl:px-4 xl:pb-4">
                    <div className="mx-auto w-full max-w-2xl xl:flex xl:flex-1 xl:flex-col">
                      {list}
                    </div>
                  </div>
                </div>
                {listFoot}
              </ChatIdProvider>
            </div>
            <div className="xl:relative xl:min-w-0 xl:flex-1">{children}</div>
          </div>
        </PendingChatDeletionProvider>
      </ListIsPreviousContext>
    </InAppDesignContext>
  );
};
