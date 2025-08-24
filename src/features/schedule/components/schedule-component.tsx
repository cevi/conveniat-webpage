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
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { useCurrentLocale } from 'next-i18n-router/client';
import { useRouter } from 'next/navigation';
import type React from 'react';
import { useMemo } from 'react';

const noEventsText: StaticTranslationString = {
  en: 'No events match your filters for this date',
  de: 'Keine Veranstaltungen entsprechen deinen Filtern für dieses Datum',
  fr: 'Aucun événement ne correspond à vos filtres pour cette date',
};

// Corrected pluralization for the German translation
const foundEventsText: StaticTranslationString = {
  en: 'Found {{count}} event{{plural}} for ',
  de: '{{count}} Veranstaltung{{plural}} gefunden für ',
  fr: '{{count}} événement{{plural}} trouvé pour ',
};

export const ScheduleComponent: React.FC<{
  scheduleEntries: CampScheduleEntryFrontendType[];
}> = ({ scheduleEntries }) => {
  const router = useRouter();

  const { currentDate, allDates, expandedEntries, carouselStartIndex, maxVisibleDays, actions } =
    useSchedule(scheduleEntries);

  const locale = useCurrentLocale(i18nConfig) as Locale;

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
    return filteredEntries.filter((entry) => entry.timeslot.date.startsWith(currentDateString));
  }, [filteredEntries, currentDate]);

  const hasProgram = currentProgram.length > 0;

  const handleReadMore = (entryId: string): void => router.push(`/app/schedule/${entryId}`);
  const handleMapClick = (location: CampMapAnnotation): void => {
    if (location.id !== '') router.push(`/app/map?locationId=${location.id}`);
  };

  let pluralSuffix = '';
  if (locale === 'de') {
    pluralSuffix = currentProgram.length === 1 ? '' : 'en';
  } else {
    pluralSuffix = currentProgram.length === 1 ? '' : 's';
  }

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
              {foundEventsText[locale]
                .replace('{{count}}', String(currentProgram.length))
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
