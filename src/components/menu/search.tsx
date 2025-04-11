'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Locale, StaticTranslationString } from '@/types';
import { useClose } from '@headlessui/react';

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
    <div>
      <form className="" id="search-form" onSubmit={onSubmit}>
        <div className="mb-4">
          <input
            id="search-input"
            name="searchInput"
            className="border-transparent h-10 w-full rounded border bg-[#e1e6e2] px-4 font-['Inter'] text-sm font-normal text-[#595961] focus:outline-none focus:ring-2 focus:ring-[#47564c]"
            type="text"
          />
        </div>

        <button
          type="submit"
          form="search-form"
          className="h-10 w-full rounded-lg bg-[#47564c] font-['Montserrat'] text-base font-bold text-[#e1e6e2] transition duration-300 hover:bg-[#3b4a3f]"
        >
          {searchButtonText[locale as Locale]}
        </button>
      </form>
    </div>
  );
};
