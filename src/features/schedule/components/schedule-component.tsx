'use client';

import type { CampMapAnnotation } from '@/features/payload-cms/payload-types';
import { DateCarousel } from '@/features/schedule/components/date-carousel';
import { NoProgramPlaceholder } from '@/features/schedule/components/no-program-placeholder';
import { ScheduleHeader } from '@/features/schedule/components/schedule-header';
import { ScheduleList } from '@/features/schedule/components/schedule-list';
import { SearchFilterBar } from '@/features/schedule/components/search-filter-bar';
import { useSchedule } from '@/features/schedule/hooks/use-schedule';
import { useScheduleFilters } from '@/features/schedule/hooks/use-schedule-filter';
import type { CampScheduleEntryFrontendType } from '@/features/schedule/types/types';
import { useRouter } from 'next/navigation';
import type React from 'react';
import { useMemo } from 'react';

export const ScheduleComponent: React.FC<{
  scheduleEntries: CampScheduleEntryFrontendType[];
}> = ({ scheduleEntries }) => {
  const router = useRouter();

  const { currentDate, allDates, expandedEntries, carouselStartIndex, maxVisibleDays, actions } =
    useSchedule(scheduleEntries);

  const {
    filters,
    filteredEntries,
    availableLocations,
    availableCategories,
    hasActiveFilters,
    handleFiltersChange,
  } = useScheduleFilters(scheduleEntries);

  // Apply date filter to the already filtered entries
  const currentProgram = useMemo(() => {
    const currentDateString = currentDate.toISOString().split('T')[0] ?? '';
    return filteredEntries.filter((entry) =>
      entry.timeslots.some((slot) => slot.date.startsWith(currentDateString)),
    );
  }, [filteredEntries, currentDate]);

  const hasProgram = currentProgram.length > 0;

  const handleReadMore = (entryId: string): void => router.push(`/app/schedule/${entryId}`);
  const handleMapClick = (location: CampMapAnnotation): void => {
    if (location.id !== '') router.push(`/app/map?locationId=${location.id}`);
  };

  return (
    <article className="mx-auto my-8 w-full max-w-2xl overflow-hidden px-4">
      <ScheduleHeader currentDate={currentDate} />

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
              Found {currentProgram.length} event{currentProgram.length === 1 ? '' : 's'} for{' '}
              {currentDate.toLocaleDateString('de-CH', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          ) : (
            <span>No events match your filters for this date</span>
          )}
        </div>
      )}

      <div className="mt-6">
        {hasProgram ? (
          <ScheduleList
            entries={currentProgram}
            expandedEntries={expandedEntries}
            onToggleExpand={actions.toggleExpanded}
            onReadMore={handleReadMore}
            onMapClick={handleMapClick}
          />
        ) : (
          <NoProgramPlaceholder currentDate={currentDate} />
        )}
      </div>
    </article>
  );
};
