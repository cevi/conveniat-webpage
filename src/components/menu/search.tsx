'use client';

import { AppSearchBar } from '@/components/ui/app-search-bar';
import type { Locale, StaticTranslationString } from '@/types/types';
import { useClose } from '@headlessui/react';
import { useRouter } from 'next/navigation';
import type React from 'react';
import { useState } from 'react';

const searchButtonText: StaticTranslationString = {
  de: 'Suchen',
  en: 'Search',
  fr: 'Chercher',
};

export const SearchComponent: React.FC<{ locale: Locale; actionURL: string }> = ({
  locale,
  actionURL,
}) => {
  const router = useRouter();
  const close = useClose();
  const [query, setQuery] = useState('');

  const onSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const searchInput = query.trim();
    if (searchInput !== '') {
      router.push(`/${locale}${actionURL}?q=${encodeURIComponent(searchInput)}`);
      router.refresh();
      close(); // close nav
    }
  };

  return (
    <form className="px-3 py-4" id="search-form" role="search" onSubmit={onSubmit}>
      <AppSearchBar
        placeholder={searchButtonText[locale]}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onClear={() => setQuery('')}
      />
    </form>
  );
};
