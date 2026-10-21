'use client';

import { AppFooterController } from '@/components/footer/hide-footer-context';
import { ChatHeaderSkeleton } from '@/features/chat/components/chat-view/chat-header';
import { cn } from '@/utils/tailwindcss-override';
import React from 'react';

/** A conversation while it loads: its header, a few bubbles on both sides, the input. */
export const ChatSkeleton: React.FC = () => (
  <div className="bg-page fixed top-(--preview-banner-height) z-[110] flex h-[calc(100dvh-var(--preview-banner-height))] w-screen flex-col xl:top-(--app-content-top) xl:left-(--app-content-left) xl:z-0 xl:h-[calc(100dvh-var(--app-content-top))] xl:w-[calc(100dvw-var(--app-content-left))]">
    <AppFooterController hideAppFooter />
    <ChatHeaderSkeleton />
    <div className="flex flex-1 flex-col justify-end gap-3 overflow-y-auto p-4">
      {Array.from({ length: 5 }, (_, index) => (
        <div key={index} className={cn('flex', index % 2 === 0 ? 'justify-start' : 'justify-end')}>
          <div
            className={cn(
              'h-14 animate-pulse rounded-2xl',
              index % 2 === 0 ? 'border-line w-64 border bg-white' : 'bg-quiet w-48',
            )}
          />
        </div>
      ))}
    </div>
    <div className="border-line border-t bg-white p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      {/* the message field: a bordered box with the send button at its end */}
      <div className="border-line flex items-end gap-[4px] rounded-[16px] border bg-white p-[4px]">
        <div className="flex h-[44px] flex-1 items-center px-2">
          <div className="bg-quiet h-4 w-36 animate-pulse rounded" />
        </div>
        <div className="bg-quiet h-[44px] w-[44px] shrink-0 animate-pulse rounded-[12px]" />
      </div>
    </div>
  </div>
);
