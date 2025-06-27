'use client';

import type { Locale, StaticTranslationString } from '@/types/types';
import { useClose } from '@headlessui/react';
import { Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React from 'react';

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

  const onSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const searchData = new FormData(event.currentTarget);
    const searchInput = searchData.get('searchInput') as string;
    if (searchInput !== '') {
      router.push(`/${locale as Locale}${actionURL}?q=${searchInput}`);
      router.refresh();
      close(); // close nav
    }
  };

  return (
    <div className="mx-auto w-full max-w-md py-6">
      <form
        className="focus-within:ring-conveniat-green mx-2 flex overflow-hidden rounded-lg border border-[#cbd5d1] bg-white shadow-xs focus-within:ring-2"
        id="search-form"
        onSubmit={onSubmit}
      >
        <input
          id="search-input"
          name="searchInput"
          className="h-12 grow px-4 font-['Inter'] text-sm text-[#333] placeholder-[#999] focus:outline-hidden"
          type="text"
          placeholder={searchButtonText[locale as Locale]}
        />
        <button
          type="submit"
          className="bg-conveniat-green flex h-12 cursor-pointer items-center justify-center px-4 text-white transition-colors duration-300 hover:bg-[#3b4a3f]"
        >
          <span className="sr-only">{searchButtonText[locale as Locale]}</span>
          <Search className="text-lg" aria-hidden="true" />
        </button>
      </form>
    </div>
  );
};
