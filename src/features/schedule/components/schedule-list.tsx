import type { CampMapAnnotation } from '@/features/payload-cms/payload-types';
import { ScheduleItem } from '@/features/schedule/components/schedule-item';
import type { CampScheduleEntryFrontendType } from '@/features/schedule/types/types';
import type React from 'react';

interface ScheduleListProperties {
  groupedEntries: { time: string; entries: CampScheduleEntryFrontendType[] }[];
  enrolledIds?: Set<string>;
  onMapClick: (location: CampMapAnnotation) => void;
}

export const ScheduleList: React.FC<ScheduleListProperties> = ({
  groupedEntries,
  enrolledIds,
  onMapClick,
}) => {
  return (
    <div className="relative space-y-6">
      {/* Timeline line - softer gray */}
      <div className="absolute top-4 bottom-4 left-[23px] w-0.5 bg-gray-200" />

      {groupedEntries.map((group) => (
        <div key={group.time} className="relative flex gap-4">
          {/* Timeline Time Marker */}
          <div className="z-10 flex w-12 flex-shrink-0 flex-col items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-gray-200 bg-white font-semibold text-gray-700 shadow-sm">
              <span className="text-xs leading-none">{group.time.split(' - ')[0]}</span>
            </div>
          </div>

          {/* Events for this time slot */}
          <div className="min-w-0 flex-1 space-y-3 pt-1">
            {group.entries.map((entry) => (
              <ScheduleItem
                key={entry.id}
                entry={entry}
                isEnrolled={enrolledIds?.has(entry.id) ?? false}
                onMapClick={onMapClick}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
