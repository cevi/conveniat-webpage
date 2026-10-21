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
    <div className="flex w-full items-center justify-between gap-1.5">
      <Button
        variant="ghost"
        size="sm"
        onClick={onPrevious}
        disabled={startIndex <= 0}
        aria-label={previousDayAriaLabel[locale]}
        className="h-14 w-7 shrink-0 cursor-pointer rounded-lg p-0 text-gray-500 hover:bg-transparent hover:text-gray-900 disabled:pointer-events-none disabled:opacity-25"
      >
        <ChevronLeft className="h-5 w-5" />
      </Button>

      <div className="flex flex-1 items-center gap-1.5">
        {visibleDates.map((date) => {
          const dateString = formatDate(date);
          const isSelected = formattedCurrentDate === dateString;
          const weekday = date.toLocaleDateString(locale, { weekday: 'short' });
          const dayNumber = date.getDate();

          return (
            <button
              key={dateString}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onDateSelect(date)}
              className={cn(
                'flex h-14 min-w-0 flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl border transition-colors select-none',
                isSelected
                  ? 'bg-conveniat-green border-conveniat-green shadow-md shadow-green-900/20'
                  : 'border-gray-200 bg-white hover:border-gray-300',
              )}
            >
              <span
                className={cn(
                  'text-[11px] leading-none font-semibold tracking-wider uppercase',
                  isSelected ? 'text-white/75' : 'text-gray-400',
                )}
              >
                {weekday}
              </span>
              <span
                className={cn(
                  'font-heading text-lg leading-none font-bold tabular-nums',
                  isSelected ? 'text-white' : 'text-gray-900',
                )}
              >
                {dayNumber}
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
        className="h-14 w-7 shrink-0 cursor-pointer rounded-lg p-0 text-gray-500 hover:bg-transparent hover:text-gray-900 disabled:pointer-events-none disabled:opacity-25"
      >
        <ChevronRight className="h-5 w-5" />
      </Button>
    </div>
  );
};
