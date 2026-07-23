import type { CampMapAnnotation } from '@/features/payload-cms/payload-types';
import { ScheduleItem } from '@/features/schedule/components/schedule-item';
import type { CampScheduleEntryFrontendType } from '@/features/schedule/types/types';
import { Clock } from 'lucide-react';
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
    <div className="space-y-6">
      {groupedEntries.map((group) => (
        <div key={group.time} className="space-y-3">
          {/* Sticky Time Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between rounded-xl border-y border-gray-100 bg-gray-50/95 px-3 py-2 shadow-2xs backdrop-blur-xs">
            <div className="flex items-center gap-2">
              <Clock className="text-conveniat-green h-4 w-4" />
              <span className="font-heading text-xs font-bold tracking-wider text-gray-800 uppercase">
                {group.time} Uhr
              </span>
            </div>
            <span className="font-body text-[11px] font-medium text-gray-500">
              {group.entries.length} {group.entries.length === 1 ? 'Termin' : 'Termine'}
            </span>
          </div>

          {/* Full Width Event Cards */}
          <div className="space-y-3">
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
