'use client';

import { AppFooterController } from '@/components/footer/hide-footer-context';
import { formFieldClassName } from '@/components/ui/field';
import { ChatHeaderSkeleton } from '@/features/chat/components/chat-view/chat-header';
import { cn } from '@/utils/tailwindcss-override';
import { Send } from 'lucide-react';
import React from 'react';

const Pulse: React.FC<{ className: string }> = ({ className }) => (
  <div className={cn('bg-quiet animate-pulse', className)} />
);

/** A run of incoming bubbles: the sender line, the bubbles, the avatar beside the last one. */
const IncomingRun: React.FC<{ widths: string[] }> = ({ widths }) => (
  <div className="flex items-end gap-2 pl-2">
    <Pulse className="h-8 w-8 shrink-0 rounded-full" />
    <div className="flex flex-col gap-0.5">
      <Pulse className="mb-1 ml-1.5 h-3 w-36 rounded" />
      {widths.map((width) => (
        <Pulse key={width} className={cn('h-12 rounded-[16px]', width)} />
      ))}
    </div>
  </div>
);

/**
 * A conversation while it loads, in its layout: the header with the avatars, the day, runs of
 * bubbles on both sides, and the composer, whose frame is real and does not pulse.
 */
export const ChatSkeleton: React.FC = () => (
  <div className="bg-page fixed top-(--preview-banner-height) z-[110] flex h-[calc(100dvh-var(--preview-banner-height))] w-screen flex-col xl:absolute xl:inset-0 xl:z-0 xl:h-auto xl:w-auto">
    <AppFooterController hideAppFooter />
    <ChatHeaderSkeleton />
    <div
      aria-hidden="true"
      className="flex flex-1 flex-col justify-end gap-3 overflow-hidden px-2 py-4"
    >
      <div className="flex justify-center py-1">
        <Pulse className="h-7 w-16 rounded-full" />
      </div>
      <IncomingRun widths={['w-60', 'w-48']} />
      <div className="flex flex-col items-end gap-0.5 pr-2">
        <Pulse className="h-12 w-56 rounded-[16px]" />
      </div>
      <IncomingRun widths={['w-64']} />
      <div className="flex flex-col items-end gap-0.5 pr-2">
        <Pulse className="h-12 w-44 rounded-[16px]" />
        <Pulse className="h-12 w-60 rounded-[16px]" />
      </div>
    </div>
    <div className="border-line border-t bg-white px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      <div className="flex items-end gap-2">
        <div className={cn(formFieldClassName, 'flex-1 px-[14px]')}>
          <Pulse className="h-4 w-40 rounded" />
        </div>
        <div className="bg-quiet flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-[12px] text-green-500">
          <Send className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>
    </div>
  </div>
);
