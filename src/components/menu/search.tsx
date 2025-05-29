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

export const SearchComponent: React.FC<{ locale: Locale }> = ({ locale }) => {
  const router = useRouter();
  const close = useClose();

  const onSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const searchData = new FormData(event.currentTarget);
    const searchInput = searchData.get('searchInput') as string;
    if (searchInput !== '') {
      router.push(`/${locale as Locale}/search?q=${searchInput}`);
      router.refresh();
      close(); // close nav
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <form
        className="flex overflow-hidden rounded-lg border border-[#cbd5d1] bg-white shadow-xs focus-within:ring-2 focus-within:ring-[#47564c]"
        id="search-form"
        onSubmit={onSubmit}
      >
        <input
          id="search-input"
          name="searchInput"
          className="grow h-12 px-4 font-['Inter'] text-sm text-[#333] placeholder-[#999] focus:outline-hidden"
          type="text"
          placeholder={searchButtonText[locale as Locale]}
        />
        <button
          type="submit"
          form="search-form"
          className="cursor-pointer flex items-center justify-center h-12 px-4 bg-[#47564c] text-white transition-colors duration-300 hover:bg-[#3b4a3f]"
        >
          <Search className="text-lg" aria-hidden="true" />
          <span className="ml-2 hidden font-['Montserrat'] text-sm font-semibold sm:inline">
            {searchButtonText[locale as Locale]}
          </span>
        </button>
      </form>
    </div>
  );
};
