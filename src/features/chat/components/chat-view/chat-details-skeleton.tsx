'use client';

import { AppFooterController } from '@/components/footer/hide-footer-context';
import { cn } from '@/utils/tailwindcss-override';
import React from 'react';

const Bar: React.FC<{ className: string }> = ({ className }) => (
  <div className={cn('bg-quiet animate-pulse rounded', className)} />
);

/** The chat details while they load: the name, the participants, the functions. */
export const ChatDetailsPageSkeleton: React.FC = () => (
  <div className="bg-page fixed top-(--preview-banner-height) z-[110] flex h-[calc(100dvh-var(--preview-banner-height))] w-screen flex-col xl:top-(--app-content-top) xl:left-(--app-content-left) xl:z-0 xl:h-[calc(100dvh-var(--app-content-top))] xl:w-[calc(100dvw-var(--app-content-left))]">
    <AppFooterController hideAppFooter />
    <div className="border-line flex h-[60px] shrink-0 items-center gap-3 border-b bg-white pr-2 pl-3">
      <Bar className="h-8 w-8 rounded-full" />
      <Bar className="h-5 w-32" />
    </div>

    <div className="flex-1 overflow-y-auto px-4 pt-4">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <div className="flex flex-col gap-3">
          <Bar className="h-3 w-24" />
          <div className="border-line rounded-[14px] border bg-white p-4">
            <Bar className="h-6 w-1/2" />
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <Bar className="h-3 w-28" />
          <div className="border-line divide-line divide-y rounded-[14px] border bg-white">
            {[1, 2, 3].map((index) => (
              <div key={index} className="flex min-h-[64px] items-center gap-3 px-4 py-3">
                <Bar className="h-11 w-11 shrink-0 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Bar className="h-4 w-40" />
                  <Bar className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);
