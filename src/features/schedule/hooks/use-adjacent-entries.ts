import { useScheduleEntries } from '@/context/schedule-entries-context';
import { useScheduleScope } from '@/features/schedule/hooks/use-schedule-scope';
import { byStart, isForQuartiere, kindOf } from '@/features/schedule/utils/programme-utils';
import { dayKeyOf } from '@/features/schedule/utils/time-utils';
import { trpc } from '@/trpc/client';
import { useMemo } from 'react';

interface AdjacentEntry {
  id: string;
  title: string;
}

interface AdjacentEntries {
  previous: AdjacentEntry | undefined;
  next: AdjacentEntry | undefined;
}

/**
 * Returns the previous and next schedule entries relative to the current entry ID.
 *
 * Uses the tRPC schedule list cache (or TanStack DB local cache) to determine
 * the full ordered list, then finds the neighbours of the given entry.
 *
 * Entries are ordered by date → time (same order as the schedule list view). Only what opens
 * a detail page counts: programme blocks, of the Quartier the list was showing.
 */
export const useAdjacentEntries = (currentId: string): AdjacentEntries => {
  // 1. Try tRPC cache first (primary source)
  const { data: scheduleList } = trpc.schedule.getScheduleEntries.useQuery(undefined, {
    staleTime: 1000 * 60 * 5,

    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // 2. Fallback to TanStack DB local cache (offline support)
  const { entries: localEntries } = useScheduleEntries();
  const { scope, myQuartierIds } = useScheduleScope();

  return useMemo(() => {
    // Prefer tRPC list (already sorted server-side) over local entries
    // In the order the list shows them: by day, then as `byStart` sorts a day.
    const entries = (scheduleList ?? localEntries)
      .filter(
        (entry) =>
          entry.id === currentId ||
          (kindOf(entry) === 'program' &&
            (scope === 'all' || isForQuartiere(entry, myQuartierIds))),
      )
      .sort(
        (a, b) =>
          dayKeyOf(a.timeslot.date).localeCompare(dayKeyOf(b.timeslot.date)) || byStart(a, b),
      );

    if (entries.length === 0) {
      return { previous: undefined, next: undefined };
    }

    const currentIndex = entries.findIndex((entry) => entry.id === currentId);

    if (currentIndex === -1) {
      return { previous: undefined, next: undefined };
    }

    const previousEntry = currentIndex > 0 ? entries[currentIndex - 1] : undefined;
    const nextEntry = currentIndex < entries.length - 1 ? entries[currentIndex + 1] : undefined;

    return {
      previous: previousEntry ? { id: previousEntry.id, title: previousEntry.title } : undefined,
      next: nextEntry ? { id: nextEntry.id, title: nextEntry.title } : undefined,
    };
  }, [scheduleList, localEntries, currentId, scope, myQuartierIds]);
};
