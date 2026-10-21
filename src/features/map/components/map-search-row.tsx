'use client';

import { useLocateControl } from '@/features/map/hooks/use-locate-control';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { LocateFixed, Search, X } from 'lucide-react';
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

const floatingClassName = 'bg-white shadow-[0_2px_10px_rgba(0,0,0,0.15)]';

/** Over the top of the map: the search for a place or a Quartier, and the way to find oneself. */
export const MapSearchRow: React.FC<{ onSearch: (searchTerm: string) => void }> = ({
  onSearch,
}) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const [value, setValue] = useState('');
  const locate = useLocateControl();

  const search = (next: string): void => {
    setValue(next);
    onSearch(next);
  };

  return (
    <div className="absolute top-3 right-4 left-4 z-50 flex items-center gap-2">
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
        className={cn(
          'flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-green-900',
          floatingClassName,
        )}
      >
        <LocateFixed className="h-5 w-5" aria-hidden="true" />
      </button>
    </div>
  );
};
