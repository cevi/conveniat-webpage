import type { RealtimeConnectionStatus } from '@/features/chat/utils/realtime-connection';
import type { Locale, StaticTranslationString } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import React from 'react';

const statusLabels: Record<RealtimeConnectionStatus, StaticTranslationString> = {
  live: { de: 'Live', en: 'Live', fr: 'Live' },
  connecting: { de: 'Verbinde…', en: 'Connecting…', fr: 'Connexion…' },
  offline: { de: 'Nicht live', en: 'Not live', fr: 'Hors ligne' },
};

const statusDescriptions: Record<RealtimeConnectionStatus, StaticTranslationString> = {
  live: {
    de: 'Live-Synchronisierung aktiv – neue Meldungen erscheinen automatisch.',
    en: 'Live sync active – new alerts appear automatically.',
    fr: 'Synchronisation en direct active – les nouvelles alertes apparaissent automatiquement.',
  },
  connecting: {
    de: 'Verbindung wird aufgebaut – Änderungen können kurz fehlen.',
    en: 'Connecting – updates may be missing for a moment.',
    fr: 'Connexion en cours – des mises à jour peuvent manquer un instant.',
  },
  offline: {
    de: 'Keine Live-Verbindung! Neue Meldungen erscheinen NICHT automatisch. Zum erneuten Verbinden klicken.',
    en: 'No live connection! New alerts will NOT appear automatically. Click to reconnect.',
    fr: 'Pas de connexion en direct ! Les nouvelles alertes n’apparaîtront PAS automatiquement. Cliquez pour reconnecter.',
  },
};

const lastSignalLabel: StaticTranslationString = {
  de: 'Letztes Signal vor',
  en: 'Last signal',
  fr: 'Dernier signal il y a',
};

const secondsSuffix: StaticTranslationString = { de: 's', en: 's ago', fr: 's' };

/** How often the age shown in the tooltip is recomputed. */
const AGE_REFRESH_INTERVAL_MS = 5000;

const dotClasses: Record<RealtimeConnectionStatus, string> = {
  live: 'bg-[var(--theme-success-500)]',
  connecting: 'bg-[var(--theme-warning-500)]',
  offline: 'bg-[var(--theme-error-500)]',
};

const badgeClasses: Record<RealtimeConnectionStatus, string> = {
  live: 'text-[var(--theme-success-500)] border-[var(--theme-success-500)]',
  connecting: 'text-[var(--theme-warning-500)] border-[var(--theme-warning-500)]',
  offline: 'text-white bg-[var(--theme-error-500)] border-[var(--theme-error-500)]',
};

interface RealtimeStatusBadgeProperties {
  status: RealtimeConnectionStatus;
  lastSignalAt: number | undefined;
  onReconnect: () => void;
  locale: Locale;
}

/**
 * Shows whether the panel is actually receiving live updates.
 *
 * Without it a dead stream is indistinguishable from a quiet one - the list simply
 * stops changing - and the operator has no reason to suspect that the alerts they
 * see are stale. Clicking reconnects and refetches.
 */
export const RealtimeStatusBadge: React.FC<RealtimeStatusBadgeProperties> = ({
  status,
  lastSignalAt,
  onReconnect,
  locale,
}) => {
  // Ticks the "last signal" age forward without reading the clock during render.
  const [now, setNow] = React.useState<number>();
  React.useEffect(() => {
    const update = (): void => setNow(Date.now());
    update();
    const timer = setInterval(update, AGE_REFRESH_INTERVAL_MS);
    return (): void => clearInterval(timer);
  }, [lastSignalAt]);

  const secondsSinceSignal =
    lastSignalAt === undefined || now === undefined
      ? undefined
      : Math.max(0, Math.round((now - lastSignalAt) / 1000));

  const title =
    secondsSinceSignal === undefined
      ? statusDescriptions[status][locale]
      : `${statusDescriptions[status][locale]} (${lastSignalLabel[locale]} ${secondsSinceSignal}${secondsSuffix[locale]})`;

  return (
    <button
      type="button"
      onClick={onReconnect}
      title={title}
      aria-live="polite"
      className={cn(
        'flex cursor-pointer items-center gap-1.5 rounded-full border px-2 py-1 text-xs font-medium transition-colors',
        badgeClasses[status],
      )}
    >
      <span
        className={cn(
          'h-2 w-2 shrink-0 rounded-full',
          dotClasses[status],
          status === 'live' && 'animate-pulse',
          status === 'offline' && 'bg-white',
        )}
      />
      {statusLabels[status][locale]}
    </button>
  );
};
