'use client';

import type { ChangeEvent } from 'react';
import React from 'react';

export const languageOptions = [
  { value: 'en', label: 'English' },
  { value: 'de', label: 'Deutsch' },
  { value: 'fr', label: 'Français' },
];

interface LanguageSwitcherProperties {
  onLanguageChange: (lang: string) => void;
  currentLocale: string;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProperties> = ({
  onLanguageChange,
  currentLocale,
}) => {
  return (
    <div className="fixed top-4 right-4 z-50">
      <select
        className="pa-4 rounded-md border border-gray-300 bg-gray-50 shadow-md focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
        value={currentLocale}
        onChange={(event: ChangeEvent<HTMLSelectElement>) => onLanguageChange(event.target.value)}
      >
        {languageOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};
