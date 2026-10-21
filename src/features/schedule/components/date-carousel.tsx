import { Button } from '@/components/ui/buttons/button';
import { useDayStripScroll } from '@/features/schedule/hooks/use-day-strip-scroll';
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

const arrowClassName =
  'h-14 w-7 shrink-0 cursor-pointer rounded-lg p-0 text-gray-500 hover:bg-transparent hover:text-gray-900 disabled:pointer-events-none disabled:opacity-25';

interface DateCarouselProperties {
  allDates: Date[];
  currentDate: Date;
  onDateSelect: (date: Date) => void;
}

/**
 * Every day of the camp in one strip that scrolls sideways under the finger and snaps to whole
 * days, five at a time. The arrows scroll it by a day for those without a touch screen.
 */
export const DateCarousel: React.FC<DateCarouselProperties> = ({
  allDates,
  currentDate,
  onDateSelect,
}) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const formattedCurrentDate = formatDate(currentDate);
  const { stripReference, canScrollBack, canScrollForward, onScroll, scrollByDays } =
    useDayStripScroll(formattedCurrentDate, allDates.length);

  return (
    <div className="flex w-full items-center gap-1.5">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => scrollByDays(-1)}
        disabled={!canScrollBack}
        aria-label={previousDayAriaLabel[locale]}
        className={arrowClassName}
      >
        <ChevronLeft className="h-5 w-5" />
      </Button>

      {/* py and -my leave room for the selected day's shadow, which the scroller would clip */}
      <div
        ref={stripReference}
        onScroll={onScroll}
        className="relative -my-2 flex min-w-0 flex-1 snap-x snap-mandatory [scrollbar-width:none] gap-1.5 overflow-x-auto overscroll-x-contain py-2 [&::-webkit-scrollbar]:hidden"
      >
        {allDates.map((date) => {
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
                'flex h-14 w-[calc((100%-4*0.375rem)/5)] shrink-0 cursor-pointer snap-start flex-col items-center justify-center gap-0.5 rounded-xl border transition-colors select-none',
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
        onClick={() => scrollByDays(1)}
        disabled={!canScrollForward}
        aria-label={nextDayAriaLabel[locale]}
        className={arrowClassName}
      >
        <ChevronRight className="h-5 w-5" />
      </Button>
    </div>
  );
};
