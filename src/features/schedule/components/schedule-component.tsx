'use client';

import { useScheduleEntries } from '@/context/schedule-entries-context';
import type { CampMapAnnotation } from '@/features/payload-cms/payload-types';
import { DateCarouselViewWrapper } from '@/features/schedule/components/date-carousel-view-wrapper';
import { NoProgramPlaceholder } from '@/features/schedule/components/no-program-placeholder';
import { ScheduleList } from '@/features/schedule/components/schedule-list';
import { ScheduleLoadingSkeleton } from '@/features/schedule/components/schedule-loading-skeleton';
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
import { useCurrentLocale } from 'next-i18n-router/client';
import { useRouter } from 'next/navigation';
import React, { useEffect, useMemo } from 'react';

const foundEventsText: StaticTranslationString = {
  en: 'Found {{count}} event{{plural}} for ',
  de: '{{count}} Veranstaltung{{plural}} gefunden für ',
  fr: '{{count}} événement{{plural}} trouvé{{plural}} pour ',
};

/**
 * Schedule component - fully client-side rendered.
 * Fetches data via tRPC and shows loading skeleton during fetch.
 */
export const ScheduleComponent: React.FC = () => {
  const router = useRouter();
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const { starredEntries } = useStar();
  const isOnline = useOnlineStatus();
  const { syncFromServer, entries: localEntries } = useScheduleEntries();

  // Fetch schedule entries via tRPC (CSR) with 5 min staleTime for instant offline cache rendering
  const { data: scheduleEntries, isLoading } = trpc.schedule.getScheduleEntries.useQuery(
    undefined,
    {
      staleTime: 1000 * 60 * 5,

      refetchOnMount: true,
      refetchOnWindowFocus: true,
    },
  );

  // Sync fresh server entries into local offline storage
  useEffect(() => {
    if (scheduleEntries != undefined && scheduleEntries.length > 0) {
      syncFromServer(scheduleEntries);
    }
  }, [scheduleEntries, syncFromServer]);

  // Combine network entries with local DB offline entries fallback
  const effectiveScheduleEntries = useMemo(() => {
    if (scheduleEntries && scheduleEntries.length > 0) {
      return scheduleEntries;
    }
    return localEntries;
  }, [scheduleEntries, localEntries]);

  // Get enrolled courses
  const enrollmentsQuery = trpc.schedule.getMyEnrollments.useQuery(undefined, {
    staleTime: 1000 * 60 * 5,
  });
  const enrolledIds = useMemo(() => {
    const raw = enrollmentsQuery.data as unknown;
    return new Set(Array.isArray(raw) ? (raw as string[]) : []);
  }, [enrollmentsQuery.data]);

  const {
    currentDate,
    allDates,
    currentProgram: rawCurrentProgram,
    carouselStartIndex,
    maxVisibleDays,
    actions,
  } = useSchedule(effectiveScheduleEntries);

  const {
    filters,
    handleFiltersChange,
    filteredEntries: currentProgram,
    hasActiveFilters,
    availableLocations,
    availableCategories,
  } = useScheduleFilters(rawCurrentProgram, starredEntries, effectiveScheduleEntries);

  const hasProgram = currentProgram.length > 0;

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

  // Show loading skeleton while fetching data
  if (isLoading && effectiveScheduleEntries.length === 0) {
    return <ScheduleLoadingSkeleton />;
  }

  return (
    <DateCarouselViewWrapper
      allDates={allDates}
      currentDate={currentDate}
      carouselStartIndex={carouselStartIndex}
      maxVisibleDays={maxVisibleDays}
      locale={locale}
      onDateSelect={actions.handleDateSelect}
      onCarouselPrevious={actions.handleCarouselPrevious}
      onCarouselNext={actions.handleCarouselNext}
    >
      {/* Search and Filter Bar */}
      <div className="mb-3">
        <SearchFilterBar
          filters={filters}
          onFiltersChange={handleFiltersChange}
          availableLocations={availableLocations}
          availableCategories={availableCategories}
        />
      </div>

      {/* Results Summary */}
      {hasActiveFilters && hasProgram && (
        <div className="mb-3 text-xs font-medium text-gray-500">
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
        </div>
      )}

      {hasProgram ? (
        <ScheduleStatusProvider courseIds={visibleCourseIds} isOnline={isOnline}>
          <ScheduleList
            groupedEntries={currentProgramGrouped}
            enrolledIds={enrolledIds}
            onMapClick={handleMapClick}
          />
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
    </DateCarouselViewWrapper>
  );
};
