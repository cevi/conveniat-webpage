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

// a phone swipes the strip; the arrows are for wider screens, where seven days leave them room
const arrowClassName =
  'hidden h-[58px] w-7 shrink-0 cursor-pointer rounded-lg p-0 text-green-500 hover:bg-transparent hover:text-green-900 disabled:pointer-events-none disabled:opacity-25 sm:flex';

interface DateCarouselProperties {
  allDates: Date[];
  currentDate: Date;
  onDateSelect: (date: Date) => void;
}

/**
 * Every day of the camp in one strip that scrolls sideways under the finger and snaps to whole
 * days, seven at a time. The arrows scroll it by a day for those without a touch screen.
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

      {/* the padding, given back by the negative margin, leaves room for a day's focus ring,
          which the scroller would clip at its edges; the scroll padding keeps the days snapping
          to where they were */}
      <div
        ref={stripReference}
        onScroll={onScroll}
        className="relative -m-1 flex min-w-0 flex-1 snap-x snap-mandatory scroll-px-1 [scrollbar-width:none] gap-1.5 overflow-x-auto overscroll-x-contain p-1 [&::-webkit-scrollbar]:hidden"
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
              aria-current={isSelected ? 'date' : undefined}
              onClick={() => onDateSelect(date)}
              className={cn(
                'flex h-[58px] w-[calc((100%-6*0.375rem)/7)] shrink-0 cursor-pointer snap-start flex-col items-center justify-center gap-1 rounded-xl border transition-colors select-none',
                isSelected
                  ? 'bg-conveniat-green border-conveniat-green'
                  : 'border-line bg-white hover:border-green-200',
              )}
            >
              <span
                className={cn(
                  'text-[11px] leading-none font-semibold tracking-wide uppercase',
                  isSelected ? 'text-white/80' : 'text-green-500',
                )}
              >
                {weekday}
              </span>
              <span
                className={cn(
                  'font-heading text-lg leading-none font-bold tabular-nums',
                  isSelected ? 'text-white' : 'text-green-900',
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
