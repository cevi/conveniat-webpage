'use client';

import { segmentClassName, segmentedTrackClassName } from '@/components/ui/segmented-control';
import { languageNames, languageOptions } from '@/config/language-options';
import { SettingsRow } from '@/features/settings/components/settings-row';
import type { Locale, StaticTranslationString } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import React from 'react';

const languageLabel: StaticTranslationString = {
  de: 'Sprache',
  en: 'Language',
  fr: 'Langue',
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
    <SettingsRow title={languageLabel[locale]} subtitle={languageNames[locale]}>
      <div role="group" aria-label={languageLabel[locale]} className={segmentedTrackClassName}>
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
    </SettingsRow>
  );
};
