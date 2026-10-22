'use client';

import { useOnlineStatus } from '@/hooks/use-online-status';
import type { Locale, StaticTranslationString } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { WifiOff } from 'lucide-react';
import type React from 'react';
import { useCallback, useEffect, useState } from 'react';

const offlineText: StaticTranslationString = {
  de: 'Du bist offline. Du siehst den zuletzt geladenen Stand.',
  en: 'You are offline. You are seeing what was last loaded.',
  fr: 'Vous êtes hors ligne. Vous voyez le dernier état chargé.',
};

/**
 * Sets the banner's height as `--offline-banner-height` on its parent while it is shown. The
 * banner sticks under the header and so lies over whatever is fixed there, like the map with its
 * search; that reads the variable to start below the banner instead.
 */
const usePublishedBannerHeight = (banner: HTMLDivElement | undefined): void => {
  useEffect(() => {
    const parent = banner?.parentElement;
    if (banner === undefined || parent === null || parent === undefined) return;
    const observer = new ResizeObserver(() => {
      parent.style.setProperty('--offline-banner-height', `${banner.offsetHeight}px`);
    });
    observer.observe(banner);
    return (): void => {
      observer.disconnect();
      parent.style.removeProperty('--offline-banner-height');
    };
  }, [banner]);
};

/**
 * Says that the device has no connection, as long as it has none.
 *
 * The app keeps working offline from its caches, so without this a user cannot tell a quiet
 * chat or a tap that leads nowhere from a missing connection.
 *
 * The locale comes in as a prop: reading it from the pathname would make the banner a dynamic
 * hole in the prerendered app shell, and the shell the service worker serves offline never
 * fills that hole.
 */
export const OfflineBanner: React.FC<{ locale: Locale; className?: string }> = ({
  locale,
  className,
}) => {
  const isOnline = useOnlineStatus();
  const [banner, setBanner] = useState<HTMLDivElement>();
  // stable, or React would detach and attach the ref, and set the state, on every render
  const bannerReference = useCallback((element: HTMLDivElement | null): void => {
    setBanner(element ?? undefined);
  }, []);
  usePublishedBannerHeight(banner);

  if (isOnline) return <></>;

  return (
    <div
      ref={bannerReference}
      role="status"
      className={cn(
        'font-body flex w-full items-center gap-2 bg-gray-800 px-4 py-2 text-xs text-white',
        className,
      )}
    >
      <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{offlineText[locale]}</span>
    </div>
  );
};
