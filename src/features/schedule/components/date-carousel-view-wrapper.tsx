'use client';

import { Button } from '@/components/ui/buttons/button';
import { DateCarousel } from '@/features/schedule/components/date-carousel';
import type { Locale, StaticTranslationString } from '@/types/types';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import React from 'react';

const nextDayLabel: StaticTranslationString = {
  en: 'Go to next day',
  de: 'Zum nächsten Tag',
  fr: 'Aller au jour suivant',
};

const previousDayLabel: StaticTranslationString = {
  en: 'Go to previous day',
  de: 'Zum vorherigen Tag',
  fr: 'Aller au jour précédent',
};

interface DateCarouselViewWrapperProperties {
  allDates: Date[];
  currentDate: Date;
  carouselStartIndex: number;
  maxVisibleDays: number;
  locale: Locale;
  onDateSelect: (date: Date) => void;
  onCarouselPrevious: () => void;
  onCarouselNext: () => void;
  children: React.ReactNode;
}

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
  carouselStartIndex,
  maxVisibleDays,
  locale,
  onDateSelect,
  onCarouselPrevious,
  onCarouselNext,
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
      <DateCarousel
        allDates={allDates}
        currentDate={currentDate}
        startIndex={carouselStartIndex}
        maxVisible={maxVisibleDays}
        onDateSelect={onDateSelect}
        onPrevious={onCarouselPrevious}
        onNext={onCarouselNext}
      />

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
                if (currentIndex + 1 >= carouselStartIndex + maxVisibleDays) {
                  onCarouselNext();
                }
              } else if (info.offset.x > threshold && currentIndex > 0 && previousDay) {
                onDateSelect(previousDay);
                if (currentIndex - 1 < carouselStartIndex) {
                  onCarouselPrevious();
                }
              }
            }}
            className="h-full touch-pan-y"
          >
            <div className="space-y-4">
              {children}

              {/* Navigation Links */}
              {(previousDay ?? nextDate) && (
                <div className="flex flex-col space-y-3 pt-4">
                  {/* Prev Day Link */}
                  {previousDay && (
                    <Button
                      variant="outline"
                      className="w-full gap-2 border-dashed text-gray-500 hover:text-gray-900"
                      onClick={() => onDateSelect(previousDay)}
                    >
                      <ArrowLeft className="h-4 w-4" />
                      <span>{previousDayLabel[locale]}</span>
                      <span className="font-semibold text-gray-900">
                        {previousDay.toLocaleDateString(locale, { weekday: 'long' })}
                      </span>
                    </Button>
                  )}

                  {/* Next Day Link */}
                  {nextDate && (
                    <Button
                      variant="outline"
                      className="w-full gap-2 border-dashed text-gray-500 hover:text-gray-900"
                      onClick={() => onDateSelect(nextDate)}
                    >
                      <span>{nextDayLabel[locale]}</span>
                      <span className="font-semibold text-gray-900">
                        {nextDate.toLocaleDateString(locale, { weekday: 'long' })}
                      </span>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
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
