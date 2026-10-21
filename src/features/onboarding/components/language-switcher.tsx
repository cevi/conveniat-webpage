'use client';

import { segmentClassName, segmentedTrackClassName } from '@/components/ui/segmented-control';
import { languageOptions } from '@/config/language-options';
import type { Locale, StaticTranslationString } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import React from 'react';

interface LanguageSwitcherProperties {
  onLanguageChange: (lang: string) => void;
  currentLocale: Locale;
}

const languageText: StaticTranslationString = {
  de: 'Sprache',
  en: 'Language',
  fr: 'Langue',
};

/**
 * The language choice of the onboarding, at the top right of every step: a segmented control
 * with every language this deployment serves, always visible, so a user who cannot read German
 * finds their own without opening anything.
 */
export const LanguageSwitcher: React.FC<LanguageSwitcherProperties> = ({
  onLanguageChange,
  currentLocale,
}) => {
  return (
    <div
      role="group"
      aria-label={languageText[currentLocale]}
      className={cn(segmentedTrackClassName, 'shrink-0')}
    >
      {languageOptions.map((option) => {
        const isCurrent = currentLocale === option.value;
        return (
          <button
            key={option.value}
            type="button"
            lang={option.value}
            aria-pressed={isCurrent}
            onClick={() => onLanguageChange(option.value)}
            className={cn(
              segmentClassName(isCurrent),
              'min-w-11 px-2 text-[13px] font-bold uppercase',
            )}
          >
            <span aria-hidden="true">{option.value}</span>
            <span className="sr-only">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
};
