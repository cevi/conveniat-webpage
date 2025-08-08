import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { useCurrentLocale } from 'next-i18n-router/client';
import type React from 'react';

const typingText: StaticTranslationString = {
  de: 'schreibt...',
  en: 'is typing...',
  fr: 'écrit...',
};

interface TypingIndicatorProperties {
  userName: string | undefined;
}

export const TypingIndicator: React.FC<TypingIndicatorProperties> = ({ userName }) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;

  if (userName === undefined || userName === '') return <></>;

  return (
    <div className="flex items-center gap-2 px-4 py-2">
      <div className="flex space-x-1">
        <div
          className={cn('h-2 w-2 animate-bounce rounded-full bg-gray-400', 'animation-delay-0')}
        />
        <div
          className={cn('h-2 w-2 animate-bounce rounded-full bg-gray-400', 'animation-delay-150')}
        />
        <div
          className={cn('h-2 w-2 animate-bounce rounded-full bg-gray-400', 'animation-delay-300')}
        />
      </div>
      <span className="font-body text-xs text-gray-500">
        {userName} {typingText[locale]}
      </span>
    </div>
  );
};
