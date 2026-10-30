'use client';

import { AppFooterController } from '@/components/footer/hide-footer-context';
import { cn } from '@/utils/tailwindcss-override';
import { ArrowLeft } from 'lucide-react';
import React from 'react';

const Bar: React.FC<{ className: string }> = ({ className }) => (
  <div className={cn('bg-quiet animate-pulse rounded', className)} />
);

/**
 * The chat details while they load, in their own layout: the header, the picture and name of
 * the chat, the card of participants, the chips of what the chat allows and the actions card.
 */
export const ChatDetailsPageSkeleton: React.FC = () => (
  <div
    aria-hidden="true"
    className="bg-page fixed top-(--preview-banner-height) z-[110] flex h-[calc(100dvh-var(--preview-banner-height))] w-screen flex-col overflow-y-hidden xl:absolute xl:inset-0 xl:z-0 xl:h-auto xl:w-auto"
  >
    <AppFooterController hideAppFooter />
    <div className="border-line flex h-[60px] shrink-0 items-center gap-1 border-b bg-white pr-2 pl-1">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center text-green-900">
        <ArrowLeft className="h-[22px] w-[22px]" />
      </div>
      <Bar className="ml-1 h-[18px] w-28" />
    </div>

    <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-6 pb-10">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <div className="flex flex-col items-center">
          <Bar className="h-[72px] w-[72px] rounded-full" />
          <Bar className="mt-4 h-7 w-52" />
          <Bar className="mt-2 h-3.5 w-44" />
        </div>
        <div className="flex flex-col gap-2">
          <Bar className="h-3 w-28" />
          <div className="border-line divide-line divide-y rounded-[14px] border bg-white">
            {[1, 2, 3, 4].map((index) => (
              <div key={index} className="flex min-h-[64px] items-center gap-3 px-4 py-2.5">
                <Bar className="h-11 w-11 shrink-0 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Bar className={index === 1 ? 'h-4 w-44' : 'h-4 w-48'} />
                  {index !== 1 && <Bar className="h-3 w-32" />}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Bar className="h-3 w-28" />
          <div className="flex flex-wrap gap-2">
            {['w-28', 'w-20', 'w-24', 'w-28'].map((width, index) => (
              <Bar key={index} className={cn('h-8 rounded-full', width)} />
            ))}
          </div>
        </div>
        <div className="border-line divide-line divide-y rounded-[14px] border bg-white">
          {[1, 2].map((index) => (
            <div key={index} className="flex min-h-14 items-center gap-3 px-4">
              <Bar className="h-5 w-5" />
              <Bar className="h-4 w-36" />
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);
