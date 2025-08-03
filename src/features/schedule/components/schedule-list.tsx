import type { CampMapAnnotation } from '@/features/payload-cms/payload-types';
import { ScheduleItem } from '@/features/schedule/components/schedule-item'; // Assuming ScheduleItem is in the same directory
import { StarProvider } from '@/features/schedule/context/star-context';
import type { CampScheduleEntryFrontendType } from '@/features/schedule/types/types';
import type React from 'react';

interface ScheduleListProperties {
  entries: CampScheduleEntryFrontendType[];
  expandedEntries: Set<string>;
  onToggleExpand: (id: string) => void;
  onReadMore: (id: string) => void;
  onMapClick: (location: CampMapAnnotation) => void;
}

export const ScheduleList: React.FC<ScheduleListProperties> = ({
  entries,
  expandedEntries,
  onToggleExpand,
  onReadMore,
  onMapClick,
}) => {
  return (
    <StarProvider>
      <div className="space-y-4">
        {entries.map((entry) => (
          <ScheduleItem
            key={entry.id}
            entry={entry}
            isExpanded={expandedEntries.has(entry.id)}
            onToggleExpand={onToggleExpand}
            onReadMore={onReadMore}
            onMapClick={onMapClick}
          />
        ))}
      </div>
    </StarProvider>
  );
};
