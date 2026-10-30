'use client';

import { SetHeaderActions } from '@/components/header/header-actions';
import { useScheduleEntries } from '@/context/schedule-entries-context';
import { DateCarouselViewWrapper } from '@/features/schedule/components/date-carousel-view-wrapper';
import { NoProgramPlaceholder } from '@/features/schedule/components/no-program-placeholder';
import { ScheduleList } from '@/features/schedule/components/schedule-list';
import { ScheduleLoadingSkeleton } from '@/features/schedule/components/schedule-loading-skeleton';
import {
  ScheduleViewSummary,
  ScheduleViewToggles,
} from '@/features/schedule/components/schedule-view-toggles';
import {
  FilterHeaderButton,
  SearchFilterBar,
  SearchHeaderButton,
} from '@/features/schedule/components/search-filter-bar';
import { programmeLabels } from '@/features/schedule/constants/schedule-labels';
import { ScheduleStatusProvider } from '@/features/schedule/context/schedule-status-context';
import { useNow } from '@/features/schedule/hooks/use-now';
import { useSchedule } from '@/features/schedule/hooks/use-schedule';
import { useScheduleFilters } from '@/features/schedule/hooks/use-schedule-filter';
import { useScheduleScope } from '@/features/schedule/hooks/use-schedule-scope';
import { byStart, findNowAndNext, isForQuartiere } from '@/features/schedule/utils/programme-utils';
import { dayKeyOf } from '@/features/schedule/utils/time-utils';
import { buildTimeline } from '@/features/schedule/utils/timeline';
import { useCurrentLocale } from '@/hooks/use-current-locale';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { useStar } from '@/hooks/use-star';
import { trpc } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { campClockOf } from '@/utils/camp-clock';
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
  const [isFilterOpen, setIsFilterOpen] = useState(false);
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

  // "Für Leitende" is offered to the people who may read the part for Leitende
  const { data: leaderAccess } = trpc.schedule.getLeaderAccess.useQuery(undefined, {
    staleTime: 1000 * 60 * 5,
  });

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
  // what the list shows as entries: the slots of a block count once, and a transfer is rail
  const shownCount = useMemo(
    () =>
      buildTimeline(currentProgram, { groupSlots: scope === 'all' }).filter(
        (item) => item.type !== 'transfer',
      ).length,
    [currentProgram, scope],
  );
  const viewToggles =
    myQuartiere.length > 0 ? (
      <ScheduleViewToggles
        myQuartiere={myQuartiere}
        scope={scope}
        onScopeChange={setScope}
        locale={locale}
      />
    ) : undefined;

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

  // the header keeps its buttons while the list loads, so they do not pop in with it
  const headerActions = (
    <SetHeaderActions>
      <SearchHeaderButton
        label={programmeLabels.search[locale]}
        isOpen={isSearchOpen}
        onToggle={() => setIsSearchOpen((open) => !open)}
      />
      <FilterHeaderButton
        filters={filters}
        isOpen={isFilterOpen}
        onOpen={() => setIsFilterOpen(true)}
        locale={locale}
      />
    </SetHeaderActions>
  );

  // Show loading skeleton while fetching data
  if (isLoading && effectiveScheduleEntries.length === 0) {
    return (
      <>
        {headerActions}
        <ScheduleLoadingSkeleton />
      </>
    );
  }

  return (
    <DateCarouselViewWrapper
      allDates={allDates}
      currentDate={currentDate}
      locale={locale}
      onDateSelect={actions.handleDateSelect}
    >
      {headerActions}

      <SearchFilterBar
        filters={filters}
        onFiltersChange={handleFiltersChange}
        availableLocations={availableLocations}
        availableCategories={availableCategories}
        view={viewToggles}
        viewSummary={
          myQuartiere.length > 0 ? (
            <ScheduleViewSummary myQuartiere={myQuartiere} scope={scope} locale={locale} />
          ) : undefined
        }
        canFilterForLeaders={leaderAccess === true}
        shownCount={shownCount}
        isFilterOpen={isFilterOpen}
        onFilterOpenChange={setIsFilterOpen}
        isSearchOpen={isSearchOpen}
        className="mb-3"
      />

      {/* On another day: one line that says what is on, and the way back to today */}
      {!isToday && today !== undefined && running !== undefined && (
        <button
          type="button"
          onClick={() => actions.handleDateSelect(today)}
          className="bg-quiet hover:bg-chip mb-3 flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 rounded-xl px-3.5 py-2 text-left text-[13px] text-green-700 transition-colors"
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
        <div className="mb-3 text-[13px] font-medium text-green-700">
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
