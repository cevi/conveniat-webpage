import { Button } from '@/components/ui/buttons/button';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCurrentLocale } from 'next-i18n-router/client';
import type React from 'react';

// Helper to ensure consistent date formatting for keys and comparisons
const formatDate = (date: Date): string => date.toISOString().split('T')[0] ?? '';

const previousDayAriaLabel: StaticTranslationString = {
  de: 'Vorheriger Tag',
  en: 'Previous day',
  fr: 'Jour précédent',
};

const nextDayAriaLabel: StaticTranslationString = {
  de: 'Nächster Tag',
  en: 'Next day',
  fr: 'Jour suivant',
};

interface DateCarouselProperties {
  allDates: Date[];
  currentDate: Date;
  startIndex: number;
  maxVisible: number;
  onDateSelect: (date: Date) => void;
  onPrevious: () => void;
  onNext: () => void;
}

export const DateCarousel: React.FC<DateCarouselProperties> = ({
  allDates,
  currentDate,
  startIndex,
  maxVisible,
  onDateSelect,
  onPrevious,
  onNext,
}) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const visibleDates = allDates.slice(startIndex, startIndex + maxVisible);
  const formattedCurrentDate = formatDate(currentDate);

  return (
    <div className="flex w-full items-center justify-between gap-1.5 rounded-2xl border border-gray-100 bg-white p-1.5 shadow-xs">
      <Button
        variant="ghost"
        size="sm"
        onClick={onPrevious}
        disabled={startIndex <= 0}
        aria-label={previousDayAriaLabel[locale]}
        className="h-9 w-9 shrink-0 rounded-xl p-0 text-gray-500 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-30"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div className="flex flex-1 items-center justify-around gap-1">
        {visibleDates.map((date) => {
          const dateString = formatDate(date);
          const isSelected = formattedCurrentDate === dateString;
          const weekday = date.toLocaleDateString(locale, { weekday: 'short' });
          const dayNumber = date.getDate();

          return (
            <button
              key={dateString}
              type="button"
              onClick={() => onDateSelect(date)}
              className={cn(
                'flex flex-1 cursor-pointer flex-col items-center justify-center rounded-xl px-1.5 py-1 transition-all',
                isSelected
                  ? 'bg-conveniat-green scale-102 font-bold text-white shadow-xs'
                  : 'text-gray-600 hover:bg-gray-100/70 hover:text-gray-900',
              )}
            >
              <span
                className={cn(
                  'font-heading text-[10px] tracking-wider uppercase',
                  isSelected ? 'font-semibold text-green-100' : 'font-medium text-gray-400',
                )}
              >
                {weekday}
              </span>
              <span className="font-heading mt-0.5 text-xs leading-none font-bold">
                {dayNumber}.
              </span>
            </button>
          );
        })}
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={onNext}
        disabled={startIndex >= allDates.length - maxVisible}
        aria-label={nextDayAriaLabel[locale]}
        className="h-9 w-9 shrink-0 rounded-xl p-0 text-gray-500 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-30"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
};
