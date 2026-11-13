'use client';

import { SetHideHeader } from '@/components/header/hide-header-context';
import { forumText } from '@/features/chat/components/forum/forum-texts';
import type { Locale } from '@/types/types';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type React from 'react';
import { useState } from 'react';

/**
 * The bar of a forum page that is a step inside the forum, like writing a post, "Zu tun" or a
 * topic's protocol, in place of the app header: the way out is back to where it started, not
 * the menu. On a desktop the app header stays.
 */
export const ForumSubpageHeader: React.FC<{
  title: string;
  locale: Locale;
  /** where back leads when the page was opened straight from a link or a push */
  fallbackHref: string;
}> = ({ title, locale, fallbackHref }) => {
  const router = useRouter();
  // opened straight from a link or a push, there is nothing in the app to go back to
  const [isEntryPage] = useState(
    () =>
      typeof location !== 'undefined' &&
      // missing in older WebViews
      typeof performance.getEntriesByType === 'function' &&
      performance.getEntriesByType('navigation')[0]?.name === location.href,
  );
  const goBack = (): void => {
    if (isEntryPage) {
      router.replace(fallbackHref);
      return;
    }
    router.back();
  };
  return (
    // in the place of the hidden app header, which the page below still leaves room for
    <div className="border-line fixed inset-x-0 top-(--app-top-inset) z-[110] flex h-[62px] items-center gap-1 border-b bg-white pr-2 pl-1 xl:hidden">
      <SetHideHeader value />
      <button
        type="button"
        onClick={goBack}
        aria-label={forumText.back[locale]}
        className="focus-visible:focus-surface hover:bg-quiet flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-green-900"
      >
        <ArrowLeft className="h-[22px] w-[22px]" aria-hidden="true" />
      </button>
      <h1 className="font-heading text-heading min-w-0 flex-1 truncate pl-1 text-[17px] font-bold">
        {title}
      </h1>
    </div>
  );
};
