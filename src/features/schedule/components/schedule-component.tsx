'use client';

import type { CampMapAnnotation } from '@/features/payload-cms/payload-types';
import { DateCarousel } from '@/features/schedule/components/date-carousel';
import { NoProgramPlaceholder } from '@/features/schedule/components/no-program-placeholder';
import { ScheduleHeader } from '@/features/schedule/components/schedule-header';
import { ScheduleList } from '@/features/schedule/components/schedule-list';
import { useSchedule } from '@/features/schedule/hooks/use-schedule';
import type { CampScheduleEntryFrontendType } from '@/features/schedule/types/types';
import { useRouter } from 'next/navigation';
import type React from 'react';

export const ScheduleComponent: React.FC<{ scheduleEntries: CampScheduleEntryFrontendType[] }> = ({
  scheduleEntries,
}) => {
  const router = useRouter();
  const {
    currentDate,
    allDates,
    currentProgram,
    hasProgram,
    expandedEntries,
    carouselStartIndex,
    maxVisibleDays,
    actions,
  } = useSchedule(scheduleEntries);

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
