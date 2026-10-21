'use client';

import { AppFooterController } from '@/components/footer/hide-footer-context';
import { ChatHeaderSkeleton } from '@/features/chat/components/chat-view/chat-header';
import { cn } from '@/utils/tailwindcss-override';
import React from 'react';

/** A conversation while it loads: its header, a few bubbles on both sides, the input. */
export const ChatSkeleton: React.FC = () => (
  <div className="bg-page fixed top-0 z-[110] flex h-dvh w-screen flex-col xl:top-(--app-content-top) xl:left-(--app-content-left) xl:z-0 xl:h-[calc(100dvh-var(--app-content-top))] xl:w-[calc(100dvw-var(--app-content-left))]">
    <AppFooterController hideAppFooter />
    <ChatHeaderSkeleton />
    <div className="flex flex-1 flex-col justify-end gap-3 overflow-y-auto p-4">
      {Array.from({ length: 5 }, (_, index) => (
        <div key={index} className={cn('flex', index % 2 === 0 ? 'justify-start' : 'justify-end')}>
          <div
            className={cn(
              'h-14 animate-pulse rounded-2xl',
              index % 2 === 0 ? 'border-line w-64 border bg-white' : 'bg-tint w-48',
            )}
          />
        </div>
      ))}
    </div>
    <div className="border-line border-t bg-white p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      <div className="bg-quiet h-12 w-full animate-pulse rounded-[22px]" />
    </div>
  </div>
);
