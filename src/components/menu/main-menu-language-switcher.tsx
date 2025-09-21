'use client';

import type { Locale, StaticTranslationString } from '@/types/types';
import { Disclosure, DisclosureButton, DisclosurePanel, useClose } from '@headlessui/react';
import { ChevronDown, Languages } from 'lucide-react';
import { usePathname, useSearchParams } from 'next/navigation';
import React from 'react';

const language: StaticTranslationString = {
  de: 'Sprache',
  en: 'Language',
  fr: 'Langue',
};

/**
 * Simple Drop Down Menu that allows to switch between languages.
 *
 * This is a client component.
 *
 */
export const MainMenuLanguageSwitcher: React.FC<{ locale: Locale }> = ({ locale }) => {
  const pathname = usePathname();
  const searchParameters = useSearchParams();

  const close = useClose();

  const handleLanguageChange = (lang: Locale): void => {
    const langRegex = /^\/(de|en|fr)\//;
    let newPath;

    if (langRegex.test(pathname)) {
      newPath = pathname.replace(langRegex, `/${lang}/`) + '?' + searchParameters.toString();
    } else {
      const path = pathname.replace(/\/(de|en|fr)\/?$/, '');
      const cleanPath = path.startsWith('//') ? path.slice(1) : path;
      newPath = `/${lang}${cleanPath}?${searchParameters.toString()}`;
    }

    // Use window.location.href for a hard refresh
    globalThis.location.href = newPath;
    close(); // close nav
  };

  return (
    <div className="mx-auto max-w-md space-y-2 py-6">
      <Disclosure as="div" className="-mx-3">
        <DisclosureButton className="group flex w-full cursor-pointer items-center justify-between rounded-lg py-2 pr-3.5 pl-3 text-base/7 font-semibold text-gray-700 hover:bg-gray-50">
          <div className="flex items-center gap-2">
            <Languages aria-hidden="true" className="size-5" />
            {language[locale]}
          </div>
          <ChevronDown aria-hidden="true" className="size-5 flex-none group-data-open:rotate-180" />
        </DisclosureButton>
        <DisclosurePanel className="mt-2 mb-4 space-y-2">
          <DisclosureButton
            onClick={() => handleLanguageChange('de')}
            className="block w-full cursor-pointer rounded-lg py-2 pr-3 pl-6 text-left text-sm/7 font-semibold text-gray-500 hover:bg-gray-50"
          >
            Deutsch
          </DisclosureButton>
          <DisclosureButton
            onClick={() => handleLanguageChange('fr')}
            className="block w-full cursor-pointer rounded-lg py-2 pr-3 pl-6 text-left text-sm/7 font-semibold text-gray-500 hover:bg-gray-50"
          >
            Français
          </DisclosureButton>
          <DisclosureButton
            onClick={() => handleLanguageChange('en')}
            className="block w-full cursor-pointer rounded-lg py-2 pr-3 pl-6 text-left text-sm/7 font-semibold text-gray-500 hover:bg-gray-50"
          >
            English
          </DisclosureButton>
        </DisclosurePanel>
      </Disclosure>
    </div>
  );
};
