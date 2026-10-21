'use client';

import { SetHeaderActions } from '@/components/header/header-actions';
import { useScheduleEntries } from '@/context/schedule-entries-context';
import { DateCarouselViewWrapper } from '@/features/schedule/components/date-carousel-view-wrapper';
import { NoProgramPlaceholder } from '@/features/schedule/components/no-program-placeholder';
import { ScheduleList } from '@/features/schedule/components/schedule-list';
import { ScheduleLoadingSkeleton } from '@/features/schedule/components/schedule-loading-skeleton';
import { ScheduleViewToggles } from '@/features/schedule/components/schedule-view-toggles';
import { SearchFilterBar } from '@/features/schedule/components/search-filter-bar';
import { programmeLabels } from '@/features/schedule/constants/schedule-labels';
import { ScheduleStatusProvider } from '@/features/schedule/context/schedule-status-context';
import { useNow } from '@/features/schedule/hooks/use-now';
import { useSchedule } from '@/features/schedule/hooks/use-schedule';
import { useScheduleFilters } from '@/features/schedule/hooks/use-schedule-filter';
import { useScheduleScope } from '@/features/schedule/hooks/use-schedule-scope';
import { byStart, findNowAndNext, isForQuartiere } from '@/features/schedule/utils/programme-utils';
import { dayKeyOf } from '@/features/schedule/utils/time-utils';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { useStar } from '@/hooks/use-star';
import { trpc } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { campClockOf } from '@/utils/camp-clock';
import { Search } from 'lucide-react';
import { useCurrentLocale } from 'next-i18n-router/client';
import React, { useEffect, useMemo, useState } from 'react';

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
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const { starredEntries, toggleStar } = useStar();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const isOnline = useOnlineStatus();
  const now = useNow();
  const { syncFromServer, entries: localEntries } = useScheduleEntries();
  const { myQuartiere, myQuartierIds, scope, setScope } = useScheduleScope();

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

  // The own Quartier, or the whole camp. Entries that name no Quartier are for everybody.
  const scopedEntries = useMemo(
    () =>
      scope === 'mine'
        ? effectiveScheduleEntries.filter((entry) => isForQuartiere(entry, myQuartierIds))
        : effectiveScheduleEntries,
    [effectiveScheduleEntries, scope, myQuartierIds],
  );

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
    actions,
  } = useSchedule(scopedEntries);

  const {
    filters,
    handleFiltersChange,
    filteredEntries,
    hasActiveFilters,
    availableLocations,
    availableCategories,
  } = useScheduleFilters(rawCurrentProgram, starredEntries, scopedEntries);

  const currentProgram = useMemo(() => [...filteredEntries].sort(byStart), [filteredEntries]);
  const hasProgram = currentProgram.length > 0;

  // "Now" is about today, whichever day the list shows and whatever it is filtered by.
  const { dayKey: todayKey, minutes: minutesOfDay } = campClockOf(now);
  const today = allDates.find((date) => dayKeyOf(date) === todayKey);
  const isToday = dayKeyOf(currentDate) === todayKey;
  // In the view of the whole camp several Quartiere have something on at once, so "now" stays
  // with the user's own Quartier whenever they have one.
  const nowAndNext = useMemo(
    () =>
      findNowAndNext(
        effectiveScheduleEntries.filter(
          (entry) =>
            dayKeyOf(entry.timeslot.date) === todayKey &&
            (myQuartierIds.size === 0 || isForQuartiere(entry, myQuartierIds)),
        ),
        minutesOfDay,
      ),
    [effectiveScheduleEntries, myQuartierIds, todayKey, minutesOfDay],
  );
  const running = nowAndNext.current ?? nowAndNext.next;

  // Only entries people can enrol in have a status worth fetching
  const visibleCourseIds = useMemo(
    () => currentProgram.filter((entry) => entry.enable_enrolment === true).map(({ id }) => id),
    [currentProgram],
  );

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
      locale={locale}
      onDateSelect={actions.handleDateSelect}
    >
      <SetHeaderActions>
        <button
          type="button"
          aria-label={programmeLabels.search[locale]}
          aria-expanded={isSearchOpen}
          onClick={() => setIsSearchOpen((open) => !open)}
          className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl"
        >
          <Search className="h-[22px] w-[22px]" aria-hidden="true" />
        </button>
      </SetHeaderActions>

      <ScheduleViewToggles
        myQuartiere={myQuartiere}
        scope={scope}
        onScopeChange={setScope}
        locale={locale}
      />

      <SearchFilterBar
        filters={filters}
        onFiltersChange={handleFiltersChange}
        availableLocations={availableLocations}
        availableCategories={availableCategories}
        isSearchOpen={isSearchOpen}
        className="mb-3"
      />

      {/* On another day: one line that says what is on, and the way back to today */}
      {!isToday && today !== undefined && running !== undefined && (
        <button
          type="button"
          onClick={() => actions.handleDateSelect(today)}
          className="mb-3 flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-left text-xs text-gray-600"
        >
          <span className="min-w-0 truncate">
            {programmeLabels[nowAndNext.current === undefined ? 'upNext' : 'now'][locale]}:{' '}
            <span className="text-conveniat-green font-semibold">{running.title}</span>
          </span>
          <span className="text-conveniat-green shrink-0 font-semibold">
            {programmeLabels.today[locale]} ›
          </span>
        </button>
      )}

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
            entries={currentProgram}
            enrolledIds={enrolledIds}
            starredIds={starredEntries}
            onToggleStar={toggleStar}
            myQuartierIds={myQuartierIds}
            groupSlots={scope === 'all'}
            now={isToday ? { dayKey: todayKey, minutes: minutesOfDay } : undefined}
          />
        </ScheduleStatusProvider>
      ) : (
        <NoProgramPlaceholder filters={filters} onFiltersChange={handleFiltersChange} />
      )}
    </DateCarouselViewWrapper>
  );
};
