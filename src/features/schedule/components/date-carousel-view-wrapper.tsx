'use client';

import { DateCarousel } from '@/features/schedule/components/date-carousel';
import type { Locale, StaticTranslationString } from '@/types/types';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight } from 'lucide-react';
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

const dayLinkClassName =
  'flex h-13 w-full cursor-pointer items-center gap-1.5 rounded-2xl border border-gray-200 bg-white px-4 text-left text-[15px] text-gray-500 transition-colors hover:border-gray-300';

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

              {/* Navigation Links */}
              {(previousDay ?? nextDate) && (
                <div className="flex flex-col space-y-3 pt-2">
                  {/* Prev Day Link */}
                  {previousDay && (
                    <button
                      type="button"
                      className={dayLinkClassName}
                      onClick={() => onDateSelect(previousDay)}
                    >
                      <ArrowLeft className="text-conveniat-green h-5 w-5 shrink-0" />
                      <span>{previousDayLabel[locale]}</span>
                      <span className="font-semibold text-gray-900">
                        {previousDay.toLocaleDateString(locale, {
                          weekday: 'long',
                          day: 'numeric',
                        })}
                      </span>
                    </button>
                  )}

                  {/* Next Day Link */}
                  {nextDate && (
                    <button
                      type="button"
                      className={dayLinkClassName}
                      onClick={() => onDateSelect(nextDate)}
                    >
                      <span>{nextDayLabel[locale]}</span>
                      <span className="font-semibold text-gray-900">
                        {nextDate.toLocaleDateString(locale, { weekday: 'long', day: 'numeric' })}
                      </span>
                      <ArrowRight className="text-conveniat-green ml-auto h-5 w-5 shrink-0" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </article>
  );
};
