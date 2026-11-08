'use client';

import { SetHideHeader } from '@/components/header/hide-header-context';
import { floatingButtonClassName } from '@/components/ui/buttons/floating-button';
import { ShareLinkButton } from '@/components/ui/buttons/share-link-button';
import { environmentVariables } from '@/config/environment-variables';
import { storyTexts } from '@/features/story/story-texts';
import type { Locale } from '@/types/types';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type React from 'react';
import { useState } from 'react';

/**
 * Back to where the screen was opened from. Where it is the first page the app loaded, from a
 * shared link or a push, `router.back()` would leave the app, so it goes to `fallbackHref`.
 */
const useGoBack = (fallbackHref: string): (() => void) => {
  const router = useRouter();
  // the server render has a `performance` but no `location`
  const [isEntryPage] = useState(
    () =>
      typeof location !== 'undefined' &&
      performance.getEntriesByType('navigation')[0]?.name === location.href,
  );
  return (): void => {
    if (isEntryPage) router.replace(fallbackHref);
    else router.back();
  };
};

/**
 * One event, figure or challenge as a screen of its own, built like a block of the programme: the
 * app header steps aside, the way back and sharing float at the top, and the page scrolls under
 * them. The bottom navigation stays.
 */
export const StoryDetailScreen: React.FC<{
  /** where the way back leads when there is nothing in the app to go back to */
  fallbackHref: string;
  /** the app path to share, like `/app/story?event=…`; nothing to share while it is unknown */
  share: { path: string; title: string } | undefined;
  locale: Locale;
  children: React.ReactNode;
}> = ({ fallbackHref, share, locale, children }) => {
  const goBack = useGoBack(fallbackHref);

  return (
    <>
      <SetHideHeader value />
      {/* below the preview banner and above the bottom navigation; on a desktop beside the menu */}
      <div className="bg-page fixed inset-x-0 top-(--app-top-inset) bottom-(--app-tab-bar-height) z-[110] flex flex-col overflow-hidden xl:top-(--app-content-top) xl:left-(--app-content-left) xl:z-0">
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between p-3 [&>*]:pointer-events-auto">
          <button
            type="button"
            onClick={goBack}
            aria-label={storyTexts.back[locale]}
            className={floatingButtonClassName}
          >
            <ArrowLeft className="h-[22px] w-[22px]" aria-hidden="true" />
          </button>
          {share !== undefined && (
            <ShareLinkButton
              url={`${environmentVariables.NEXT_PUBLIC_APP_HOST_URL}${share.path}`}
              title={share.title}
              locale={locale}
              compact
              className={floatingButtonClassName}
            />
          )}
        </div>
        <div className="flex-1 overflow-x-hidden overflow-y-auto">
          <article className="mx-auto w-full max-w-xl space-y-5 px-4 pt-[72px] pb-6 sm:px-6">
            {children}
          </article>
        </div>
      </div>
    </>
  );
};
