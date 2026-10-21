'use client';

import { useFitToSearchResults } from '@/features/map/hooks/use-fit-to-search-results';
import { useLocateControl, useLocateOnArrival } from '@/features/map/hooks/use-locate-control';
import type { CampMapAnnotationPoint, CampMapAnnotationPolygon } from '@/features/map/types/types';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { Loader2, LocateFixed, LocateOff, Search, X } from 'lucide-react';
import { useCurrentLocale } from 'next-i18n-router/client';
import type React from 'react';
import { useState } from 'react';

const searchLabel: StaticTranslationString = {
  de: 'Ort oder Quartier suchen',
  en: 'Search for a place or Quartier',
  fr: 'Chercher un lieu ou un Quartier',
};

const clearLabel: StaticTranslationString = {
  de: 'Suche leeren',
  en: 'Clear search',
  fr: 'Effacer la recherche',
};

const locateLabel: StaticTranslationString = {
  de: 'Mein Standort',
  en: 'My location',
  fr: 'Ma position',
};

const noResultsLabel: StaticTranslationString = {
  de: 'Kein Ort gefunden für «{{term}}»',
  en: 'No place found for “{{term}}”',
  fr: 'Aucun lieu trouvé pour « {{term}} »',
};

const locateDeniedLabel: StaticTranslationString = {
  de: 'Der Standortzugriff ist blockiert. Erlaube ihn in den Einstellungen.',
  en: 'Location access is blocked. Allow it in the settings.',
  fr: "L'accès à la position est bloqué. Autorise-le dans les réglages.",
};

const locateUnavailableLabel: StaticTranslationString = {
  de: 'Dein Standort ist gerade nicht verfügbar.',
  en: 'Your location is not available right now.',
  fr: "Ta position n'est pas disponible pour le moment.",
};

const floatingClassName = 'bg-white shadow-[0_2px_10px_rgba(0,0,0,0.15)]';

/**
 * Over the top of the map: the search for a place or a Quartier, and the way to find oneself.
 * The map moves to what the search finds; a search that finds nothing, and a position that cannot
 * be found, say so under the row.
 */
export const MapSearchRow: React.FC<{
  onSearch: (searchTerm: string) => void;
  results: readonly (CampMapAnnotationPoint | CampMapAnnotationPolygon)[];
}> = ({ onSearch, results }) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const [value, setValue] = useState('');
  const { locate, tryLocate, state: locateState } = useLocateControl();
  useLocateOnArrival(tryLocate);
  useFitToSearchResults(value, results);

  const search = (next: string): void => {
    setValue(next);
    onSearch(next);
  };

  let message: string | undefined;
  if (locateState === 'denied') message = locateDeniedLabel[locale];
  if (locateState === 'unavailable') message = locateUnavailableLabel[locale];
  if (value.trim() !== '' && results.length === 0) {
    message = noResultsLabel[locale].replace('{{term}}', value.trim());
  }

  let LocateIcon = LocateFixed;
  if (locateState === 'searching') LocateIcon = Loader2;
  if (locateState === 'denied' || locateState === 'unavailable') LocateIcon = LocateOff;

  return (
    <div className="absolute top-3 right-4 left-4 z-50">
      <div className="flex items-center gap-2">
        <label
          className={cn(
            'flex h-11 min-w-0 flex-1 items-center gap-2.5 rounded-full pl-4',
            floatingClassName,
          )}
        >
          <Search className="h-5 w-5 shrink-0 text-green-500" aria-hidden="true" />
          <span className="sr-only">{searchLabel[locale]}</span>
          <input
            type="search"
            value={value}
            placeholder={searchLabel[locale]}
            onChange={(event) => search(event.target.value)}
            className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-green-900 outline-hidden placeholder:text-green-500 [&::-webkit-search-cancel-button]:hidden"
          />
          {value !== '' && (
            <button
              type="button"
              onClick={() => search('')}
              aria-label={clearLabel[locale]}
              className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-green-500"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </label>
        <button
          type="button"
          onClick={locate}
          aria-label={locateLabel[locale]}
          aria-pressed={locateState === 'active'}
          aria-busy={locateState === 'searching'}
          className={cn(
            'flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full',
            floatingClassName,
            locateState === 'active' ? 'bg-conveniat-green text-white' : 'text-green-900',
          )}
        >
          <LocateIcon
            className={cn('h-5 w-5', locateState === 'searching' && 'animate-spin')}
            aria-hidden="true"
          />
        </button>
      </div>
      <p
        role="status"
        className={cn(
          'mt-2 w-fit max-w-full rounded-full px-3.5 py-2 text-[13px] font-medium',
          floatingClassName,
          locateState === 'denied' || locateState === 'unavailable'
            ? 'text-danger-text'
            : 'text-green-900',
          message === undefined && 'sr-only',
        )}
      >
        {message}
      </p>
    </div>
  );
};
