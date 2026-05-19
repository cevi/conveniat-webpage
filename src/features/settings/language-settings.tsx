'use client';

import type { Locale, StaticTranslationString } from '@/types/types';
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react';
import { ChevronDown, Languages } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import React from 'react';

const languageLabel: StaticTranslationString = {
  de: 'Sprache',
  en: 'Language',
  fr: 'Langue',
};

const languageNames: Record<Locale, string> = {
  de: 'Deutsch',
  en: 'English',
  fr: 'Français',
};

export const LanguageSettings: React.FC<{ locale: Locale }> = ({ locale }) => {
  const pathname = usePathname();
  const searchParameters = useSearchParams();
  const router = useRouter();

  const handleLanguageChange = (lang: Locale): void => {
    const langRegex = /^\/(de|en|fr)\//;
    let newPath;

    const searchParametersString = searchParameters.toString();
    const searchParameterPrefixed =
      searchParametersString === '' ? '' : `?${searchParametersString}`;

    if (langRegex.test(pathname)) {
      newPath = pathname.replace(langRegex, `/${lang}/`) + searchParameterPrefixed;
    } else {
      const path = pathname.replace(/\/(de|en|fr)\/?$/, '');
      const cleanPath = path.startsWith('//') ? path.slice(1) : path;
      newPath = `/${lang}/${cleanPath}${searchParameterPrefixed}`;
    }

    if (newPath.endsWith('/') && newPath.length > 1) {
      newPath = newPath.slice(0, -1);
    }

    router.push(newPath);
  };

  return (
    <div className="space-y-2">
      <Disclosure as="div" className="-mx-3">
        <DisclosureButton className="group flex w-full cursor-pointer items-center justify-between rounded-lg py-2 pr-3.5 pl-3 hover:bg-gray-50">
          <div className="flex items-center gap-3">
            <Languages className="h-5 w-5 text-gray-400" />
            <div className="text-left">
              <p className="font-medium text-gray-900">{languageLabel[locale]}</p>
              <p className="text-sm text-gray-500">{languageNames[locale]}</p>
            </div>
          </div>
          <ChevronDown
            aria-hidden="true"
            className="size-5 flex-none text-gray-400 group-data-open:rotate-180"
          />
        </DisclosureButton>
        <DisclosurePanel className="mt-2 space-y-1 px-3.5">
          {(['de', 'fr', 'en'] as Locale[]).map((lang) => (
            <button
              key={lang}
              onClick={() => handleLanguageChange(lang)}
              className="block w-full cursor-pointer rounded-lg px-6 py-2 text-left text-sm font-semibold text-gray-500 hover:bg-gray-50"
            >
              {languageNames[lang]}
            </button>
          ))}
        </DisclosurePanel>
      </Disclosure>
    </div>
  );
};
