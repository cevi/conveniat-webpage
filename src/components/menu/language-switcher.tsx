'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import React, { useState } from 'react';
import { Languages } from 'lucide-react';
import type { Locale, StaticTranslationString } from '@/types/types';
import { useClose } from '@headlessui/react';
import { LOCALE } from '@/features/payload-cms/settings/locales';

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
export const LanguageSwitcher: React.FC<{ locale: Locale }> = ({ locale }) => {
  // State to toggle the visibility of the language buttons
  const [showLanguageOptions, setShowLanguageOptions] = useState(false);

  const route = useRouter();
  const pathname = usePathname();
  const searchParameters = useSearchParams();

  const close = useClose();

  const handleLanguageChange = (lang: string): void => {
    setShowLanguageOptions(false);

    const langRegex = /^\/(de|en|fr)\//;
    if (langRegex.test(pathname)) {
      route.push(pathname.replace(langRegex, `/${lang}/`) + '?' + searchParameters.toString(), {
        scroll: false,
      });
      route.refresh();
      close(); // close nav
    } else {
      route.push(
        `/${lang}/${pathname.replace(/\/(de|en|fr)\/?$/, '')}?${searchParameters.toString()}`,
        {
          scroll: false,
        },
      );
      route.refresh();
      close(); // close nav
    }
  };

  return (
    <>
      <button
        className="group flex w-full items-center gap-2 rounded-lg px-3 py-1.5 data-[focus]:bg-white/10"
        onClick={() => setShowLanguageOptions(!showLanguageOptions)}
      >
        <Languages className="cursor-pointer" />
        {language[locale]}
      </button>

      {/* Show language options when `showLanguageOptions` is true */}
      {showLanguageOptions && (
        <div className="flex flex-col gap-2 rounded-xl border-2 border-gray-200 bg-white p-3">
          <button
            className="px-4 py-2 hover:bg-gray-200"
            onClick={() => handleLanguageChange(LOCALE.DE)}
          >
            Deutsch
          </button>
          <button
            className="px-4 py-2 hover:bg-gray-200"
            onClick={() => handleLanguageChange(LOCALE.EN)}
          >
            English
          </button>
          <button
            className="px-4 py-2 hover:bg-gray-200"
            onClick={() => handleLanguageChange(LOCALE.FR)}
          >
            Français
          </button>
        </div>
      )}
    </>
  );
};
