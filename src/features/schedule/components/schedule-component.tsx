'use client';

import { Button } from '@/components/ui/buttons/button';
import type { CampMapAnnotation } from '@/features/payload-cms/payload-types';
import { DateCarousel } from '@/features/schedule/components/date-carousel';
import { NoProgramPlaceholder } from '@/features/schedule/components/no-program-placeholder';
import { ScheduleList } from '@/features/schedule/components/schedule-list';
import { SearchFilterBar } from '@/features/schedule/components/search-filter-bar';
import { ScheduleStatusProvider } from '@/features/schedule/context/schedule-status-context';
import { useSchedule } from '@/features/schedule/hooks/use-schedule';
import { useScheduleFilters } from '@/features/schedule/hooks/use-schedule-filter';
import type { CampScheduleEntryFrontendType } from '@/features/schedule/types/types';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { useStar } from '@/hooks/use-star';
import { trpc } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useCurrentLocale } from 'next-i18n-router/client';
import { useRouter } from 'next/navigation';
import React, { useMemo } from 'react';

const noEventsText: StaticTranslationString = {
  en: 'No events match your filters for this date',
  de: 'Keine Veranstaltungen entsprechen deinen Filtern für dieses Datum',
  fr: 'Aucun événement ne correspond à vos filtres pour cette date',
};

const foundEventsText: StaticTranslationString = {
  en: 'Found {{count}} event{{plural}} for ',
  de: '{{count}} Veranstaltung{{plural}} gefunden für ',
  fr: '{{count}} événement{{plural}} trouvé{{plural}} pour ',
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

interface ScheduleComponentProperties {
  scheduleEntries: CampScheduleEntryFrontendType[];
}

export const ScheduleComponent: React.FC<ScheduleComponentProperties> = ({ scheduleEntries }) => {
  const router = useRouter();
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const { starredEntries } = useStar();
  const isOnline = useOnlineStatus();

  // Get enrolled courses
  const { data: myEnrollments } = trpc.schedule.getMyEnrollments.useQuery();
  const enrolledIds = useMemo(() => new Set(myEnrollments ?? []), [myEnrollments]);

  // Hydrate schedule entries into TanStack Query cache for offline access
  const { data: hydratedScheduleEntries } = trpc.schedule.getScheduleEntries.useQuery(undefined, {
    initialData: scheduleEntries,
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  const {
    currentDate,
    allDates,
    currentProgram: rawCurrentProgram,
    carouselStartIndex,
    maxVisibleDays,
    actions,
  } = useSchedule(hydratedScheduleEntries);

  const {
    filters,
    handleFiltersChange,
    filteredEntries: currentProgram,
    hasActiveFilters,
    availableLocations,
    availableCategories,
  } = useScheduleFilters(rawCurrentProgram, starredEntries);

  const hasProgram = currentProgram.length > 0;

  // Track previous date to determine slide direction
  const [previousDate, setPreviousDate] = React.useState(currentDate);
  const [direction, setDirection] = React.useState(1);

  if (currentDate.getTime() !== previousDate.getTime()) {
    setDirection(currentDate > previousDate ? 1 : -1);
    setPreviousDate(currentDate);
  }

  // Handle Map Click
  const handleMapClick = (location: CampMapAnnotation): void => {
    router.push(`/app/map?locationId=${location.id}`);
  };

  // Group entries by time and location for display
  const currentProgramGrouped = useMemo(() => {
    const grouped: { time: string; entries: CampScheduleEntryFrontendType[] }[] = [];
    const timeMap = new Map<string, CampScheduleEntryFrontendType[]>();

    for (const entry of currentProgram) {
      const timeKey = entry.timeslot.time; // e.g. "14:00"
      if (!timeMap.has(timeKey)) {
        timeMap.set(timeKey, []);
      }
      timeMap.get(timeKey)?.push(entry);
    }

    // Sort times
    const sortedTimes = [...timeMap.keys()].sort();

    for (const time of sortedTimes) {
      grouped.push({
        time: `${time}`,
        entries: timeMap.get(time) ?? [],
      });
    }

    return grouped;
  }, [currentProgram]);

  // Get visible course IDs for bulk status fetching
  const visibleCourseIds = useMemo(() => currentProgram.map((entry) => entry.id), [currentProgram]);

  const totalEventsCount = currentProgram.length;

  let pluralSuffix = '';
  if (locale === 'de') {
    pluralSuffix = totalEventsCount === 1 ? '' : 'en';
  } else {
    pluralSuffix = totalEventsCount === 1 ? '' : 's';
  }

  const dateKey = currentDate.toISOString().split('T')[0] ?? '';

  // Calculate Next Day logic
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

  return (
    <article className="mx-auto w-full max-w-2xl px-4 py-8">
      <DateCarousel
        allDates={allDates}
        currentDate={currentDate}
        startIndex={carouselStartIndex}
        maxVisible={maxVisibleDays}
        onDateSelect={actions.handleDateSelect}
        onPrevious={actions.handleCarouselPrevious}
        onNext={actions.handleCarouselNext}
      />

      {/* Search and Filter Bar */}
      <div className="mt-6 mb-4">
        <SearchFilterBar
          filters={filters}
          onFiltersChange={handleFiltersChange}
          availableLocations={availableLocations}
          availableCategories={availableCategories}
        />
      </div>

      {/* Results Summary */}
      {hasActiveFilters && (
        <div className="mb-4 text-sm text-gray-600">
          {hasProgram ? (
            <span>
              {foundEventsText[locale]
                .replace('{{count}}', String(totalEventsCount))
                .replace('{{plural}}', pluralSuffix)}
              {currentDate.toLocaleDateString(locale, {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          ) : (
            <span>{noEventsText[locale]}</span>
          )}
        </div>
      )}

      {/* Schedule List with Slide Animation */}
      <div className="relative min-h-[300px]">
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
              } else if (info.offset.x > threshold && currentIndex > 0 && previousDay) {
                actions.handleDateSelect(previousDay);
              }
            }}
            className="h-full touch-pan-y"
          >
            {hasProgram ? (
              <ScheduleStatusProvider courseIds={visibleCourseIds} isOnline={isOnline}>
                <div className="space-y-8">
                  <ScheduleList
                    groupedEntries={currentProgramGrouped}
                    enrolledIds={enrolledIds}
                    onMapClick={handleMapClick}
                  />

                  {/* Navigation Links */}
                  {(previousDay ?? nextDate) && (
                    <div className="flex flex-col space-y-3">
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
              </ScheduleStatusProvider>
            ) : (
              <NoProgramPlaceholder
                currentDate={currentDate}
                hasActiveFilters={hasActiveFilters}
                onClearFilters={() =>
                  handleFiltersChange({
                    searchText: '',
                    selectedLocations: [],
                    selectedCategory: undefined,
                    starredOnly: false,
                  })
                }
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </article>
  );
};
