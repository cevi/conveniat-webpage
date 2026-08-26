'use client';

import { Button } from '@/components/ui/buttons/button';
import { DateCarouselViewWrapper } from '@/features/schedule/components/date-carousel-view-wrapper';
import { ScheduleLoadingSkeleton } from '@/features/schedule/components/schedule-loading-skeleton';
import { SearchFilterBar } from '@/features/schedule/components/search-filter-bar';
import { ShiftCard } from '@/features/schedule/components/shift-card';
import { useSchedule } from '@/features/schedule/hooks/use-schedule';
import { useShiftFilters } from '@/features/schedule/hooks/use-shift-filter';
import { trpc } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { FilterX } from 'lucide-react';
import React from 'react';

const noShiftsText: StaticTranslationString = {
  en: 'No helper shifts available for this date.',
  de: 'Noch keine Schichteinsätze für dieses Datum verfügbar.',
  fr: 'Aucun service disponible pour cette date.',
};

const noMatchingShiftsText: StaticTranslationString = {
  en: 'No helper shifts match your filters.',
  de: 'Keine Schichteinsätze entsprechen deinen Filtern.',
  fr: 'Aucun service ne correspond à vos filtres.',
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

/**
 * Client Component for the /app/helper-portal page.
 * Displays date selector carousel and helper shifts filtered by selected date.
 */
export const ShiftsComponent: React.FC<{ locale: Locale }> = ({ locale }) => {
  const { data: shifts, isLoading } = trpc.schedule.getHelperShifts.useQuery(undefined, {
    staleTime: 1000 * 60 * 5,

    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const {
    currentDate,
    allDates,
    currentProgram: shiftsOfDay,
    carouselStartIndex,
    maxVisibleDays,
    actions,
  } = useSchedule(shifts ?? []);

  const {
    filters,
    filteredShifts: currentShifts,
    availableCategories,
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
          availableCategories={availableCategories}
          showStarredToggle={false}
        />
      </div>

      {/* Results Summary */}
      {hasActiveFilters && hasShifts && (
        <div className="mb-3 text-xs font-medium text-gray-500">
          {foundShiftsText[locale]
            .replace('{{count}}', String(currentShifts.length))
            .replaceAll('{{plural}}', pluralSuffix)}
        </div>
      )}

      {hasShifts && (
        <div className="space-y-3">
          {currentShifts.map((shift) => (
            <ShiftCard key={shift.id} shift={shift} locale={locale} />
          ))}
        </div>
      )}

      {!hasShifts && !hasActiveFilters && (
        <div className="py-12 text-center text-sm text-gray-400">{noShiftsText[locale]}</div>
      )}

      {!hasShifts && hasActiveFilters && (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <span className="text-sm text-gray-400">{noMatchingShiftsText[locale]}</span>
          <Button
            onClick={clearFilters}
            className="bg-conveniat-green font-heading cursor-pointer rounded-xl px-4 py-2 text-xs font-semibold text-white shadow-xs transition-all hover:bg-green-600 hover:shadow-md"
          >
            <FilterX className="mr-1.5 h-3.5 w-3.5" />
            {clearFiltersText[locale]}
          </Button>
        </div>
      )}
    </DateCarouselViewWrapper>
  );
};
