'use client';

import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { Search, X } from 'lucide-react';
import { useCurrentLocale } from 'next-i18n-router/client';
import type React from 'react';

const clearLabel: StaticTranslationString = {
  de: 'Suche leeren',
  en: 'Clear search',
  fr: 'Effacer la recherche',
};

/** The search over a list of chats or contacts: a white pill, like the search on the map. */
export const ChatSearchField: React.FC<{
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}> = ({ placeholder, value, onChange }) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;

  return (
    <label className="border-line flex h-11 min-w-0 items-center gap-2.5 rounded-full border bg-white pl-4">
      <Search className="h-5 w-5 shrink-0 text-green-500" aria-hidden="true" />
      <span className="sr-only">{placeholder}</span>
      <input
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-green-900 outline-hidden placeholder:text-green-500 [&::-webkit-search-cancel-button]:hidden"
      />
      {value !== '' && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label={clearLabel[locale]}
          className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-green-500"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      )}
    </label>
  );
};
