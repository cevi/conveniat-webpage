'use client';

import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { useCurrentLocale } from 'next-i18n-router/client';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState, useTransition } from 'react';

const searchText: StaticTranslationString = {
  de: 'Suche',
  en: 'Search',
  fr: 'Recherche',
};

export const SearchBar: React.FC<{ initialQuery: string; actionURL: string }> = ({
  initialQuery,
  actionURL,
}) => {
  const router = useRouter();
  const locale = useCurrentLocale(i18nConfig);
  const [query, setQuery] = useState(initialQuery);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  const handleSubmit = (event: React.FormEvent): void => {
    event.preventDefault();
    startTransition(() => {
      router.push(`${actionURL}?q=${encodeURIComponent(query)}`);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex gap-2">
      <input
        type="text"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className="w-full rounded border border-gray-300 px-4 py-2 focus:border-green-600 focus:outline-none"
        placeholder={searchText[locale as Locale]}
      />
      <button
        type="submit"
        disabled={isPending}
        className="flex min-w-[100px] cursor-pointer items-center justify-center rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? (
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
        ) : (
          searchText[locale as Locale]
        )}
      </button>
    </form>
  );
};
