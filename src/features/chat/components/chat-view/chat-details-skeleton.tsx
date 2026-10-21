'use client';

import { AppFooterController } from '@/components/footer/hide-footer-context';
import { cn } from '@/utils/tailwindcss-override';
import { ArrowLeft } from 'lucide-react';
import React from 'react';

const Bar: React.FC<{ className: string }> = ({ className }) => (
  <div className={cn('bg-quiet animate-pulse rounded', className)} />
);

/** A section label with an optional button at its end, as the loaded sections have them. */
const SectionHead: React.FC<{ labelWidth: string; button?: string }> = ({ labelWidth, button }) => (
  <div className="flex min-h-11 items-center justify-between gap-3">
    <Bar className={cn('h-3', labelWidth)} />
    {button !== undefined && <Bar className={button} />}
  </div>
);

/**
 * The chat details while they load, in their own layout: the header, the name with its edit
 * button, the participants with "Verwalten", and the chat functions.
 */
export const ChatDetailsPageSkeleton: React.FC = () => (
  <div
    aria-hidden="true"
    className="bg-page fixed top-(--preview-banner-height) z-[110] flex h-[calc(100dvh-var(--preview-banner-height))] w-screen flex-col overflow-y-hidden xl:top-(--app-content-top) xl:left-(--app-content-left) xl:z-0 xl:h-[calc(100dvh-var(--app-content-top))] xl:w-[calc(100dvw-var(--app-content-left))]"
  >
    <AppFooterController hideAppFooter />
    <div className="border-line flex h-[60px] shrink-0 items-center gap-1 border-b bg-white pr-2 pl-1">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center text-green-900">
        <ArrowLeft className="h-[22px] w-[22px]" />
      </div>
      <Bar className="ml-1 h-[18px] w-28" />
    </div>

    <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-4 pb-10">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <div className="flex flex-col gap-2">
          <SectionHead labelWidth="w-20" button="h-11 w-11 rounded-full" />
          <div className="border-line flex h-[52px] items-center rounded-[14px] border bg-white px-4">
            <Bar className="h-5 w-1/2" />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <SectionHead labelWidth="w-24" button="h-11 w-28 rounded-xl" />
          <div className="border-line divide-line divide-y rounded-[14px] border bg-white">
            {[1, 2, 3].map((index) => (
              <div key={index} className="flex min-h-[72px] items-center gap-3 px-4 py-3">
                <Bar className="h-11 w-11 shrink-0 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Bar className="h-4 w-48" />
                  <Bar className="h-3 w-32" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Bar className="h-3 w-28" />
          <Bar className="h-3 w-56" />
          <div className="border-line divide-line divide-y rounded-[14px] border bg-white">
            {[1, 2, 3, 4].map((index) => (
              <div key={index} className="flex h-[41px] items-center justify-between px-4">
                <Bar className="h-4 w-36" />
                <Bar className="h-4 w-4" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);
