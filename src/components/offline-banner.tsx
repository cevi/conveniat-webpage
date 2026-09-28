'use client';

import { useOnlineStatus } from '@/hooks/use-online-status';
import type { Locale, StaticTranslationString } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { WifiOff } from 'lucide-react';
import type React from 'react';

const offlineText: StaticTranslationString = {
  de: 'Du bist offline. Du siehst den zuletzt geladenen Stand.',
  en: 'You are offline. You are seeing what was last loaded.',
  fr: 'Vous êtes hors ligne. Vous voyez le dernier état chargé.',
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

  if (isOnline) return <></>;

  return (
    <div
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
