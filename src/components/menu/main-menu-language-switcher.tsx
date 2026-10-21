'use client';

import { SectionLabel } from '@/components/ui/section-label';
import { segmentClassName, segmentedTrackClassName } from '@/components/ui/segmented-control';
import { languageOptions } from '@/config/language-options';
import type { Locale, StaticTranslationString } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { useClose } from '@headlessui/react';
import { usePathname, useSearchParams } from 'next/navigation';
import React from 'react';

const language: StaticTranslationString = {
  de: 'Sprache',
  en: 'Language',
  fr: 'Langue',
};

/**
 * The language switch of the main menu, a segmented control like the one in the settings. It
 * reloads the page in the new language rather than navigating, so every server-rendered part of
 * the page follows.
 */
export const MainMenuLanguageSwitcher: React.FC<{ locale: Locale }> = ({ locale }) => {
  const pathname = usePathname();
  const searchParameters = useSearchParams();

  const close = useClose();

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
      const pathWithoutLeadingSlash = cleanPath.replace(/^\//, '');
      newPath = `/${lang}/${pathWithoutLeadingSlash}${searchParameterPrefixed}`;
    }

    // drop tailing slash if exists
    if (newPath.endsWith('/') && newPath.length > 1) {
      newPath = newPath.slice(0, -1);
    }

    // Use window.location.href for a hard refresh
    globalThis.location.assign(newPath);
    close(); // close nav
  };

  return (
    <section className="px-3 py-4">
      <SectionLabel className="mb-2">{language[locale]}</SectionLabel>
      <div role="group" aria-label={language[locale]} className={segmentedTrackClassName}>
        {languageOptions.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            lang={value}
            onClick={() => handleLanguageChange(value)}
            aria-pressed={value === locale}
            className={cn(segmentClassName(value === locale), 'flex-1 text-sm font-semibold')}
          >
            {label}
          </button>
        ))}
      </div>
    </section>
  );
};
