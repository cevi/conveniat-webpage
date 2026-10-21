'use client';

import { AppFooterController } from '@/components/footer/hide-footer-context';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { ArrowLeft } from 'lucide-react';
import { useCurrentLocale } from 'next-i18n-router/client';
import Link from 'next/link';
import type React from 'react';

const backLabel: StaticTranslationString = {
  de: 'Zurück zu den Chats',
  en: 'Back to chats',
  fr: 'Retour aux discussions',
};

/** The new-chat screen while its contacts load: the same header, rows in place of contacts. */
export const CreateChatSkeleton: React.FC = () => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  return (
    <div className="bg-page fixed top-(--preview-banner-height) z-[110] flex h-[calc(100dvh-var(--preview-banner-height))] w-screen flex-col xl:top-(--app-content-top) xl:left-(--app-content-left) xl:z-0 xl:h-[calc(100dvh-var(--app-content-top))] xl:w-[calc(100dvw-var(--app-content-left))]">
      <AppFooterController hideAppFooter />

      <div className="border-line shrink-0 border-b bg-white">
        <div className="flex h-[60px] items-center gap-1 pr-3 pl-1">
          <Link
            href="/app/chat"
            aria-label={backLabel[locale]}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-green-900"
          >
            <ArrowLeft className="h-[22px] w-[22px]" aria-hidden="true" />
          </Link>
          <div className="bg-quiet h-6 w-32 animate-pulse rounded" />
        </div>
        <div className="mx-auto w-full max-w-xl px-4 pb-3">
          <div className="bg-quiet h-11 w-full animate-pulse rounded-xl" />
        </div>
      </div>
      <div className="mx-auto w-full max-w-xl flex-1 overflow-y-auto pt-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="flex min-h-16 items-center gap-3 px-4 py-2.5">
            <div className="bg-quiet h-11 w-11 animate-pulse rounded-full" />
            <div className="flex flex-col gap-1.5">
              <div className="bg-quiet h-4 w-44 animate-pulse rounded" />
              <div className="bg-quiet h-3 w-56 animate-pulse rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
