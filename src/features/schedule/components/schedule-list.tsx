import { ScheduleFixedRow } from '@/features/schedule/components/schedule-fixed-row';
import { ScheduleRow } from '@/features/schedule/components/schedule-row';
import type { CampScheduleEntryFrontendType } from '@/features/schedule/types/types';
import { kindOf, slotOf } from '@/features/schedule/utils/programme-utils';
import type React from 'react';

interface ScheduleListProperties {
  /** the entries of one day, in the order to show them */
  entries: CampScheduleEntryFrontendType[];
  enrolledIds: ReadonlySet<string>;
  starredIds: ReadonlySet<string>;
  /** the time of day in minutes when the list shows today, `undefined` on any other day */
  minutesOfToday: number | undefined;
  /** the entry running right now, as the "Jetzt" card names it */
  currentId: string | undefined;
  quartierChips: ReadonlySet<string> | undefined;
}

/**
 * The programme of one day as a dense agenda. The day stays in order at any time: what is over
 * is dimmed in place, never moved, so the list reads the same in the morning and at night.
 */
export const ScheduleList: React.FC<ScheduleListProperties> = ({
  entries,
  enrolledIds,
  starredIds,
  minutesOfToday,
  currentId,
  quartierChips,
}) => (
  <div className="border-t border-gray-100">
    {entries.map((entry) => {
      const end = slotOf(entry)?.end;
      const isPast = minutesOfToday !== undefined && end !== undefined && end <= minutesOfToday;

      return kindOf(entry) === 'program' ? (
        <ScheduleRow
          key={entry.id}
          entry={entry}
          isEnrolled={enrolledIds.has(entry.id)}
          isStarred={starredIds.has(entry.id)}
          isNow={entry.id === currentId}
          isPast={isPast}
          quartierChips={quartierChips}
        />
      ) : (
        <ScheduleFixedRow key={entry.id} entry={entry} isPast={isPast} />
      );
    })}
  </div>
);
