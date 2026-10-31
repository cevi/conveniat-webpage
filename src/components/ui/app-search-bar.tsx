'use client';

import {
  fieldInputClassName,
  searchFieldClassName,
  searchFieldOnPageClassName,
} from '@/components/ui/field';
import { useCurrentLocale } from '@/hooks/use-current-locale';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { Search, X } from 'lucide-react';
import type React from 'react';

const clearLabel: StaticTranslationString = {
  de: 'Suche leeren',
  en: 'Clear search',
  fr: 'Effacer la recherche',
};

interface AppSearchBarProperties {
  placeholder: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onClear?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  /** a name for screen readers, when the placeholder alone would not say what is searched */
  label?: string;
  /** opened by a tap on a search button, so the keyboard comes up with it */
  autoFocus?: boolean;
  /** sits on the grey page instead of a white surface, so it is white with a line */
  onPage?: boolean;
  className?: string;
}

/**
 * The app's one search field, in the shared frame of `field.ts`: the magnifier in front, a real
 * search input with a label, and a clear button once there is something to clear.
 */
export const AppSearchBar: React.FC<AppSearchBarProperties> = ({
  placeholder,
  value,
  onChange,
  onClear,
  onFocus,
  onBlur,
  label,
  autoFocus = false,
  onPage = false,
  className,
}) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;

  return (
    <label className={cn(onPage ? searchFieldOnPageClassName : searchFieldClassName, className)}>
      <Search className="h-[18px] w-[18px] shrink-0 text-green-500" aria-hidden="true" />
      <span className="sr-only">{label ?? placeholder}</span>
      <input
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onFocus={onFocus}
        onBlur={onBlur}
        autoFocus={autoFocus}
        className={cn(fieldInputClassName, 'pl-0')}
      />
      {value !== '' && onClear !== undefined && (
        <button
          type="button"
          onClick={onClear}
          aria-label={clearLabel[locale]}
          className="flex h-[44px] w-[44px] shrink-0 cursor-pointer items-center justify-center rounded-[12px] text-green-500 hover:text-green-900"
        >
          <X className="h-[18px] w-[18px]" aria-hidden="true" />
        </button>
      )}
    </label>
  );
};
