'use client';

import { Button } from '@/components/ui/buttons/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { languageOptions } from '@/config/language-options';
import type { Locale, StaticTranslationString } from '@/types/types';
import { Globe } from 'lucide-react';
import React from 'react';

interface LanguageSwitcherProperties {
  onLanguageChange: (lang: string) => void;
  currentLocale: Locale;
}

const changeLanguageText: StaticTranslationString = {
  de: 'Sprache ändern',
  en: 'Change Language',
  fr: 'Changer de langue',
};

export const LanguageSwitcher: React.FC<LanguageSwitcherProperties> = ({
  onLanguageChange,
  currentLocale,
}) => {
  return (
    <div className="fixed top-4 right-4 z-50">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full bg-white/80 shadow-sm backdrop-blur-sm hover:bg-white focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
          >
            <Globe className="h-5 w-5 text-gray-700" />
            <span className="sr-only">{changeLanguageText[currentLocale]}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="border-gray-200 bg-white">
          {languageOptions.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onClick={() => onLanguageChange(option.value)}
              className={currentLocale === option.value ? 'bg-gray-100 font-medium' : ''}
            >
              {option.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
