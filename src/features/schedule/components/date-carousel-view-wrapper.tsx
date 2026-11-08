'use client';

import { Button } from '@/components/ui/buttons/button';
import { DateCarousel } from '@/features/schedule/components/date-carousel';
import type { Locale, StaticTranslationString } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import React from 'react';

const nextDayLabel: StaticTranslationString = {
  en: 'Next day',
  de: 'Nächster Tag',
  fr: 'Jour suivant',
};

const previousDayLabel: StaticTranslationString = {
  en: 'Previous day',
  de: 'Vorheriger Tag',
  fr: 'Jour précédent',
};

interface DateCarouselViewWrapperProperties {
  allDates: Date[];
  currentDate: Date;
  locale: Locale;
  onDateSelect: (date: Date) => void;
  children: React.ReactNode;
}

const swipeHint: StaticTranslationString = {
  en: 'or swipe sideways',
  de: 'oder seitlich wischen',
  fr: 'ou balayer sur le côté',
};

const dayPillClassName = 'rounded-full [&_svg]:size-5';

const formatWeekday = (date: Date, locale: Locale): string =>
  date.toLocaleDateString(locale, { weekday: 'long' });

const formatFullDay = (date: Date, locale: Locale): string =>
  date.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });

const slideVariants = {
  enter: (direction_: number): { x: number; opacity: number } => ({
    x: direction_ > 0 ? 50 : -50,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction_: number): { x: number; opacity: number } => ({
    x: direction_ > 0 ? -50 : 50,
    opacity: 0,
  }),
};

/**
 * Reusable wrapper component for date-carousel based views (Schedule, Helper Shifts).
 * Handles date carousel, slide animations, drag gestures, and prev/next day navigation links.
 */
export const DateCarouselViewWrapper: React.FC<DateCarouselViewWrapperProperties> = ({
  allDates,
  currentDate,
  locale,
  onDateSelect,
  children,
}) => {
  const [previousDate, setPreviousDate] = React.useState(currentDate);
  const [direction, setDirection] = React.useState(1);

  if (currentDate.getTime() !== previousDate.getTime()) {
    setDirection(currentDate > previousDate ? 1 : -1);
    setPreviousDate(currentDate);
  }

  const dateKey = currentDate.toISOString().split('T')[0] ?? '';

  const currentIndex = allDates.findIndex(
    (d) => d.toISOString().split('T')[0] === currentDate.toISOString().split('T')[0],
  );
  const nextDate =
    currentIndex !== -1 && currentIndex < allDates.length - 1
      ? allDates[currentIndex + 1]
      : undefined;

  const previousDay =
    currentIndex !== -1 && currentIndex > 0 ? allDates[currentIndex - 1] : undefined;

  return (
    <article className="mx-auto w-full max-w-2xl p-4 sm:p-6">
      <DateCarousel allDates={allDates} currentDate={currentDate} onDateSelect={onDateSelect} />

      <div className="relative mt-4 min-h-[300px]">
        <AnimatePresence initial={false} mode="wait" custom={direction}>
          <motion.div
            key={dateKey}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              duration: 0.25,
              ease: 'easeOut',
            }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              const threshold = 50;
              if (info.offset.x < -threshold && nextDate) {
                onDateSelect(nextDate);
              } else if (info.offset.x > threshold && currentIndex > 0 && previousDay) {
                onDateSelect(previousDay);
              }
            }}
            className="h-full touch-pan-y"
          >
            <div className="space-y-4">
              {children}

              {/* the neighbouring days as a pair of pills: the weekday is enough to say which
                  one, the full date goes to the screen reader */}
              {(previousDay ?? nextDate) && (
                <nav className="flex flex-col items-center gap-2 pt-4">
                  <div className="flex justify-center gap-2.5">
                    {previousDay && (
                      <Button
                        type="button"
                        variant="outlined"
                        size="touch"
                        className={cn(dayPillClassName, 'pr-4 pl-2.5')}
                        aria-label={`${previousDayLabel[locale]}: ${formatFullDay(previousDay, locale)}`}
                        onClick={() => onDateSelect(previousDay)}
                      >
                        <ChevronLeft aria-hidden="true" />
                        {formatWeekday(previousDay, locale)}
                      </Button>
                    )}
                    {nextDate && (
                      <Button
                        type="button"
                        variant="outlined"
                        size="touch"
                        className={cn(dayPillClassName, 'pr-2.5 pl-4')}
                        aria-label={`${nextDayLabel[locale]}: ${formatFullDay(nextDate, locale)}`}
                        onClick={() => onDateSelect(nextDate)}
                      >
                        {formatWeekday(nextDate, locale)}
                        <ChevronRight aria-hidden="true" />
                      </Button>
                    )}
                  </div>
                  {/* a mouse drags the day as well, but nobody calls that a swipe */}
                  <p className="hidden text-xs text-green-500 pointer-coarse:block">
                    {swipeHint[locale]}
                  </p>
                </nav>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </article>
  );
};
