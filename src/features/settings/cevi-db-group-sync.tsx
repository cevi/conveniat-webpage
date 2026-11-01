'use client';

import { Button } from '@/components/ui/buttons/button';
import { SettingsRow } from '@/features/settings/components/settings-row';
import {
  useCeviDatabaseGroupSync,
  type CeviDatabaseGroupSyncState,
} from '@/features/settings/hooks/use-cevi-db-group-sync';
import { useCurrentLocale } from '@/hooks/use-current-locale';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { RefreshCw } from 'lucide-react';
import type React from 'react';

const title: StaticTranslationString = {
  de: 'Gruppen und Berechtigungen',
  en: 'Groups and permissions',
  fr: 'Groupes et autorisations',
};

const syncButton: StaticTranslationString = {
  de: 'Aus der Cevi.DB neu laden',
  en: 'Reload from Cevi.DB',
  fr: 'Recharger depuis la Cevi.DB',
};

const reloadLabel: StaticTranslationString = {
  de: 'Neu laden',
  en: 'Reload',
  fr: 'Recharger',
};

const subtitles: Record<
  Exclude<CeviDatabaseGroupSyncState, 'failed' | 'idle'>,
  StaticTranslationString
> = {
  syncing: {
    de: 'Wird aus der Cevi.DB geladen …',
    en: 'Loading from Cevi.DB …',
    fr: 'Chargement depuis la Cevi.DB …',
  },
  synced: {
    de: 'Auf dem Stand der Cevi.DB',
    en: 'Up to date with Cevi.DB',
    fr: 'À jour avec la Cevi.DB',
  },
};

const failedText: StaticTranslationString = {
  de: 'Gerade nicht möglich. Versuche es in einer Minute erneut.',
  en: 'Not possible right now. Try again in a minute.',
  fr: "Impossible pour l'instant. Réessaie dans une minute.",
};

/**
 * Lets a user who was just added to a group in Cevi.DB pick up the rights that come with it,
 * without waiting for the session to refresh on its own.
 */
export const CeviDatabaseGroupSync: React.FC = () => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const { state, sync } = useCeviDatabaseGroupSync();

  return (
    <SettingsRow
      title={title[locale]}
      subtitle={state === 'failed' || state === 'idle' ? undefined : subtitles[state][locale]}
      error={state === 'failed' ? failedText[locale] : undefined}
      action={
        <Button
          variant="quiet"
          size="touch"
          className="px-3 text-[13px]"
          onClick={() => void sync()}
          disabled={state === 'syncing'}
          title={syncButton[locale]}
        >
          <RefreshCw className={cn(state === 'syncing' && 'animate-spin')} aria-hidden="true" />
          {reloadLabel[locale]}
        </Button>
      }
    />
  );
};
