'use client';

import { languageNames, languageOptions } from '@/config/language-options';
import { SettingsRow } from '@/features/settings/components/settings-row';
import type { Locale, StaticTranslationString } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { Languages } from 'lucide-react';
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
    <SettingsRow icon={Languages} title={languageLabel[locale]} subtitle={languageNames[locale]}>
      <div
        role="group"
        aria-label={languageLabel[locale]}
        className="bg-quiet flex h-11 rounded-xl p-[3px]"
      >
        {languageOptions.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            lang={value}
            onClick={() => handleLanguageChange(value)}
            aria-current={value === locale ? 'true' : undefined}
            className={cn(
              'flex-1 cursor-pointer rounded-[9px] text-sm font-semibold transition-colors',
              value === locale ? 'bg-white text-green-900 shadow-xs' : 'text-green-700',
            )}
          >
            {label}
          </button>
        ))}
      </div>
    </SettingsRow>
  );
};
