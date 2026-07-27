'use client';

import { Button } from '@/components/ui/buttons/button';
import { PageSectionsConverter } from '@/features/payload-cms/converters/page-sections';
import type { ContentBlock } from '@/features/payload-cms/converters/page-sections/section-wrapper';
import { DateCarousel } from '@/features/schedule/components/date-carousel';
import { ScheduleLoadingSkeleton } from '@/features/schedule/components/schedule-loading-skeleton';
import { ShiftCard } from '@/features/schedule/components/shift-card';
import { useSchedule } from '@/features/schedule/hooks/use-schedule';
import { trpc } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import React from 'react';

const noShiftsText: StaticTranslationString = {
  en: 'No helper shifts available for this date.',
  de: 'Noch keine Schichteinsätze für dieses Datum verfügbar.',
  fr: 'Aucun service disponible pour cette date.',
};

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

function hasShiftMainContent(mainContent?: unknown): boolean {
  if (!Array.isArray(mainContent) || mainContent.length === 0) {
    return false;
  }

  return mainContent.some((block) => {
    if (block === null || block === undefined || typeof block !== 'object') {
      return false;
    }
    const b = block as Record<string, unknown>;

    if (b['blockType'] === 'richTextSection') {
      const section =
        typeof b['richTextSection'] === 'object' && b['richTextSection'] !== null
          ? (b['richTextSection'] as Record<string, unknown>)
          : undefined;
      const root =
        typeof section?.['root'] === 'object' && section['root'] !== null
          ? (section['root'] as Record<string, unknown>)
          : undefined;
      if (root === undefined) {
        return false;
      }

      const hasTextNode = (node: unknown): boolean => {
        if (node === null || node === undefined || typeof node !== 'object') {
          return false;
        }
        const n = node as Record<string, unknown>;
        if (typeof n['text'] === 'string' && n['text'].trim().length > 0) {
          return true;
        }
        if (Array.isArray(n['children'])) {
          return n['children'].some((childItem) => hasTextNode(childItem));
        }
        return false;
      };

      return hasTextNode(root);
    }

    return true;
  });
}

/**
 * Client Component for the /app/helper-portal page.
 * Displays date selector carousel and helper shifts filtered by selected date.
 */
export const ShiftsComponent: React.FC<{ locale: Locale }> = ({ locale }) => {
  const { data: shifts, isLoading } = trpc.schedule.getHelperShifts.useQuery(undefined, {
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  const {
    currentDate,
    allDates,
    currentProgram: currentShifts,
    carouselStartIndex,
    maxVisibleDays,
    actions,
  } = useSchedule(shifts ?? []);

  const hasShifts = currentShifts.length > 0;

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

  if (isLoading) {
    return <ScheduleLoadingSkeleton />;
  }

  return (
    <article className="mx-auto w-full max-w-2xl p-4 sm:p-6">
      <DateCarousel
        allDates={allDates}
        currentDate={currentDate}
        startIndex={carouselStartIndex}
        maxVisible={maxVisibleDays}
        onDateSelect={actions.handleDateSelect}
        onPrevious={actions.handleCarouselPrevious}
        onNext={actions.handleCarouselNext}
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
                actions.handleDateSelect(nextDate);
                actions.handleCarouselNext();
              } else if (info.offset.x > threshold && currentIndex > 0 && previousDay) {
                actions.handleDateSelect(previousDay);
                actions.handleCarouselPrevious();
              }
            }}
            className="h-full touch-pan-y"
          >
            {hasShifts ? (
              <div className="space-y-4">
                <div className="space-y-3">
                  {currentShifts.map((shift) => {
                    const hasMainContent = hasShiftMainContent(shift.mainContent);

                    return (
                      <ShiftCard key={shift.id} shift={shift} locale={locale}>
                        {hasMainContent && (
                          <PageSectionsConverter
                            blocks={shift.mainContent as ContentBlock[]}
                            locale={locale}
                          />
                        )}
                      </ShiftCard>
                    );
                  })}
                </div>

                {/* Navigation Links */}
                {(previousDay ?? nextDate) && (
                  <div className="flex flex-col space-y-3 pt-4">
                    {/* Prev Day Link */}
                    {previousDay && (
                      <Button
                        variant="outline"
                        className="w-full gap-2 border-dashed text-gray-500 hover:text-gray-900"
                        onClick={() => actions.handleDateSelect(previousDay)}
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
                        onClick={() => actions.handleDateSelect(nextDate)}
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
            ) : (
              <div className="py-12 text-center text-sm text-gray-400">{noShiftsText[locale]}</div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </article>
  );
};
