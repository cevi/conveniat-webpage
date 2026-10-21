'use client';

import { SetHeaderActions } from '@/components/header/header-actions';
import { Button } from '@/components/ui/buttons/button';
import { EmptyState } from '@/components/ui/empty-state';
import { DateCarouselViewWrapper } from '@/features/schedule/components/date-carousel-view-wrapper';
import { ScheduleLoadingSkeleton } from '@/features/schedule/components/schedule-loading-skeleton';
import { SearchFilterBar } from '@/features/schedule/components/search-filter-bar';
import { ShiftCard } from '@/features/schedule/components/shift-card';
import { useSchedule } from '@/features/schedule/hooks/use-schedule';
import { useShiftFilters } from '@/features/schedule/hooks/use-shift-filter';
import { trpc } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { CalendarX, FilterX, Search } from 'lucide-react';
import React, { useState } from 'react';

const noShiftsText: StaticTranslationString = {
  en: 'No helper shifts for this date yet',
  de: 'Noch keine Schichteinsätze für dieses Datum',
  fr: 'Pas encore de services pour cette date',
};

const noMatchingShiftsText: StaticTranslationString = {
  en: 'No helper shifts match your filters',
  de: 'Keine Schichteinsätze entsprechen deinen Filtern',
  fr: 'Aucun service ne correspond à vos filtres',
};

const clearFiltersText: StaticTranslationString = {
  en: 'Clear Filters',
  de: 'Filter zurücksetzen',
  fr: 'Effacer les filtres',
};

const foundShiftsText: StaticTranslationString = {
  en: 'Found {{count}} shift{{plural}}',
  de: '{{count}} Treffer',
  fr: '{{count}} service{{plural}} trouvé{{plural}}',
};

const searchShiftsText: StaticTranslationString = {
  en: 'Search the helper shifts',
  de: 'Schichteinsätze durchsuchen',
  fr: 'Rechercher dans les services',
};

/**
 * Client Component for the /app/helper-portal page.
 * The day strip, and the helper shifts of the selected day on a timeline like the programme's;
 * search and the category filter open from the app header.
 */
export const ShiftsComponent: React.FC<{ locale: Locale }> = ({ locale }) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const { data: shifts, isLoading } = trpc.schedule.getHelperShifts.useQuery(undefined, {
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

  const { currentDate, allDates, currentProgram: shiftsOfDay, actions } = useSchedule(shifts ?? []);

  const {
    filters,
    filteredShifts: currentShifts,
    availableCategories,
    availableLocations,
    hasActiveFilters,
    handleFiltersChange,
    clearFilters,
  } = useShiftFilters(shiftsOfDay, shifts ?? []);

  const hasShifts = currentShifts.length > 0;

  const pluralSuffix = currentShifts.length === 1 ? '' : 's';

  if (isLoading) {
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
          aria-label={searchShiftsText[locale]}
          aria-expanded={isSearchOpen}
          onClick={() => setIsSearchOpen((open) => !open)}
          className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl"
        >
          <Search className="h-[22px] w-[22px]" aria-hidden="true" />
        </button>
      </SetHeaderActions>

      <SearchFilterBar
        filters={filters}
        onFiltersChange={handleFiltersChange}
        availableCategories={availableCategories}
        availableLocations={availableLocations}
        showStarredToggle={false}
        isSearchOpen={isSearchOpen}
        className="mb-3"
      />

      {hasActiveFilters && hasShifts && (
        <div className="mb-3 text-[13px] text-green-700">
          {foundShiftsText[locale]
            .replace('{{count}}', String(currentShifts.length))
            .replaceAll('{{plural}}', pluralSuffix)}
        </div>
      )}

      {hasShifts && (
        <ol>
          {currentShifts.map((shift) => (
            <ShiftCard key={shift.id} shift={shift} locale={locale} />
          ))}
        </ol>
      )}

      {!hasShifts && !hasActiveFilters && (
        <EmptyState icon={CalendarX} title={noShiftsText[locale]} />
      )}

      {!hasShifts && hasActiveFilters && (
        <EmptyState
          icon={FilterX}
          title={noMatchingShiftsText[locale]}
          action={
            <Button variant="quiet" size="touch" onClick={clearFilters}>
              <FilterX aria-hidden="true" />
              {clearFiltersText[locale]}
            </Button>
          }
        />
      )}
    </DateCarouselViewWrapper>
  );
};
