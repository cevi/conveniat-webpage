import type { CampCategory, CampMapAnnotation } from '@/features/payload-cms/payload-types';
import type { HelperShiftFrontendType } from '@/features/schedule/api/get-helper-shifts';
import type { CampScheduleEntryFrontendType } from '@/features/schedule/types/types';
import { resolveLocation } from '@/features/schedule/utils/location-utils';

/**
 * A schedule entry or a helper shift, reduced to what "Programm von heute" renders.
 */
export interface DashboardEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  location: CampMapAnnotation | undefined;
  category: string | CampCategory | null | undefined;
  href: string;
  isShift: boolean;
}

interface SelectTodaysDashboardEventsInput {
  scheduleEntries: CampScheduleEntryFrontendType[];
  /** the courses the user starred - organised courses are starred server side, see `ensureOrganiserStars` */
  starredEntryIds: ReadonlySet<string>;
  shifts: HelperShiftFrontendType[];
  enrolledShiftIds: readonly string[];
  organisedShiftIds: readonly string[];
  /** "today" in the user's own timezone, which is the one they read the dashboard in */
  today: Date;
  limit: number;
}

const isSameDay = (isoDate: string, today: Date): boolean => {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return false;

  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
};

/** `"08:00 - 12:00"` -> `"08:00"`, so that shifts and schedule entries sort against each other */
const startOf = (time: string): string => time.split(' - ')[0] ?? '00:00';

/**
 * The entries and shifts to show in the dashboard's "Programm von heute" card.
 *
 * A schedule entry qualifies when it is starred, a shift when the user is enrolled in it or
 * organises it. Both are then merged into a single chronological list, because the point of the
 * card is to answer "what do I have to be at next", regardless of which collection it lives in.
 */
export const selectTodaysDashboardEvents = ({
  scheduleEntries,
  starredEntryIds,
  shifts,
  enrolledShiftIds,
  organisedShiftIds,
  today,
  limit,
}: SelectTodaysDashboardEventsInput): DashboardEvent[] => {
  const myShiftIds = new Set([...enrolledShiftIds, ...organisedShiftIds]);

  const entryEvents: DashboardEvent[] = scheduleEntries
    .filter((entry) => starredEntryIds.has(entry.id) && isSameDay(entry.timeslot.date, today))
    .map((entry) => ({
      id: entry.id,
      title: entry.title,
      date: entry.timeslot.date,
      time: entry.timeslot.time,
      location: resolveLocation(entry.location),
      category: entry.category,
      href: `/app/schedule?id=${entry.id}`,
      isShift: false,
    }));

  const shiftEvents: DashboardEvent[] = shifts
    .filter((shift) => myShiftIds.has(shift.id) && isSameDay(shift.timeslot.date, today))
    .map((shift) => ({
      id: shift.id,
      title: shift.title,
      date: shift.timeslot.date,
      time: shift.timeslot.time,
      location: resolveLocation(shift.location),
      category: shift.category,
      // shifts have no detail page of their own, the helper portal is where they are read
      href: '/app/helper-portal',
      isShift: true,
    }));

  return [...entryEvents, ...shiftEvents]
    .sort((a, b) => {
      const byStart = startOf(a.time).localeCompare(startOf(b.time));
      if (byStart !== 0) return byStart;
      return a.title.localeCompare(b.title);
    })
    .slice(0, limit);
};
