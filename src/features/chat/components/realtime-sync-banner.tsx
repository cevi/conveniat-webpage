'use client';

import type { RealtimeConnectionStatus } from '@/features/chat/utils/realtime-connection';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { RefreshCw, WifiOff } from 'lucide-react';
import { useCurrentLocale } from 'next-i18n-router/client';
import React from 'react';

const notLiveText: StaticTranslationString = {
  de: 'Keine Live-Verbindung – neue Nachrichten erscheinen nicht automatisch.',
  en: 'No live connection – new messages will not appear automatically.',
  fr: 'Pas de connexion en direct – les nouveaux messages n’apparaîtront pas automatiquement.',
};

const reconnectText: StaticTranslationString = {
  de: 'Neu verbinden',
  en: 'Reconnect',
  fr: 'Reconnecter',
};

interface RealtimeSyncBannerProperties {
  status: RealtimeConnectionStatus;
  onReconnect: () => void;
  className?: string;
}

/**
 * Warns that the chat is no longer receiving live updates.
 *
 * A dead stream is indistinguishable from a quiet one - the conversation simply stops
 * moving - so without this the user keeps reading stale messages with no reason to
 * suspect it. Only `offline` is surfaced: `connecting` is transient and heals itself on
 * every navigation, and flashing a warning for it would train people to ignore the bar.
 */
export const RealtimeSyncBanner: React.FC<RealtimeSyncBannerProperties> = ({
  status,
  onReconnect,
  className,
}) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;

  if (status !== 'offline') return <></>;

  return (
    <button
      type="button"
      onClick={onReconnect}
      aria-live="polite"
      className={cn(
        'font-body flex w-full items-center gap-2 bg-red-50 px-4 py-2 text-left text-xs text-red-700',
        'border-y border-red-200 transition-colors hover:bg-red-100',
        className,
      )}
    >
      <WifiOff className="h-4 w-4 shrink-0" />
      <span className="flex-1">{notLiveText[locale]}</span>
      <span className="flex shrink-0 items-center gap-1 font-semibold underline">
        <RefreshCw className="h-3 w-3" />
        {reconnectText[locale]}
      </span>
    </button>
  );
};
