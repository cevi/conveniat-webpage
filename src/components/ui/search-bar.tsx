'use client';

import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { useCurrentLocale } from 'next-i18n-router/client';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';

const searchText: StaticTranslationString = {
  de: 'Suche',
  en: 'Search',
  fr: 'Recherche',
};

export const SearchBar: React.FC<{ initialQuery: string }> = ({ initialQuery }) => {
  const router = useRouter();
  const locale = useCurrentLocale(i18nConfig);
  const [query, setQuery] = useState(initialQuery);

  const handleSubmit = (event: React.FormEvent): void => {
    event.preventDefault();
    router.push(`/search?q=${encodeURIComponent(query)}`);
  };

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex gap-2">
      <input
        type="text"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className="w-full rounded border border-gray-300 px-4 py-2"
        placeholder={searchText[locale as Locale]}
      />
      <button
        type="submit"
        className="cursor-pointer rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700 hover:icon:search hover:text-white"
      >
        {searchText[locale as Locale]}
      </button>
    </form>
  );
};
