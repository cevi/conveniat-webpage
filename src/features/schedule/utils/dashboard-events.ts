import type { CampCategory, CampMapAnnotation } from '@/features/payload-cms/payload-types';
import type { HelperShiftFrontendType } from '@/features/schedule/api/get-helper-shifts';
import type { CampScheduleEntryFrontendType } from '@/features/schedule/types/types';
import { resolveLocation } from '@/features/schedule/utils/location-utils';
import { parseTimeToMinutes } from '@/features/schedule/utils/time-utils';

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
  /**
   * the current instant in the user's own timezone, which is the one they read the dashboard in:
   * it decides both which day is "today" and which of today's entries are already over
   */
  now: Date;
  limit: number;
}

const isSameDay = (isoDate: string, now: Date): boolean => {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return false;

  return (
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  );
};

/**
 * `"08:00 - 12:00"` -> `{ start: 480, end: 720 }` in minutes from midnight, so that shifts and
 * schedule entries sort against each other and can be compared to the current time of day.
 *
 * A timeslot without an end (`"08:00"`) is a point in time, so it ends when it starts. A timeslot
 * we cannot parse yields `undefined` and is then treated as neither sortable nor expired, so a
 * malformed entry stays visible instead of silently disappearing from the card.
 */
const parseTimeslot = (time: string): { start: number; end: number } | undefined => {
  const [startString, endString] = time.split(' - ').map((part) => part.trim());
  if (startString === undefined || startString === '') return undefined;

  const start = parseTimeToMinutes(startString);
  const end = endString === undefined ? start : parseTimeToMinutes(endString);
  if (Number.isNaN(start) || Number.isNaN(end)) return undefined;

  return { start, end };
};

/** the time of day of `now` in minutes from midnight, to compare against a parsed timeslot */
const minutesOfDay = (now: Date): number => now.getHours() * 60 + now.getMinutes();

/**
 * The entries and shifts to show in the dashboard's "Programm von heute" card.
 *
 * A schedule entry qualifies when it is starred, a shift when the user is enrolled in it or
 * organises it. Both are then merged into a single chronological list, because the point of the
 * card is to answer "what do I have to be at next", regardless of which collection it lives in.
 *
 * Entries that already ended are dropped before the list is capped: the card answers "what is
 * next", so a morning block must not keep occupying one of the few slots for the rest of the day.
 */
export const selectTodaysDashboardEvents = ({
  scheduleEntries,
  starredEntryIds,
  shifts,
  enrolledShiftIds,
  organisedShiftIds,
  now,
  limit,
}: SelectTodaysDashboardEventsInput): DashboardEvent[] => {
  const myShiftIds = new Set([...enrolledShiftIds, ...organisedShiftIds]);
  const currentMinutes = minutesOfDay(now);

  const entryEvents: DashboardEvent[] = scheduleEntries
    .filter((entry) => starredEntryIds.has(entry.id) && isSameDay(entry.timeslot.date, now))
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
    .filter((shift) => myShiftIds.has(shift.id) && isSameDay(shift.timeslot.date, now))
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
    .filter((event) => {
      const timeslot = parseTimeslot(event.time);
      return timeslot === undefined || timeslot.end >= currentMinutes;
    })
    .sort((a, b) => {
      const byStart = (parseTimeslot(a.time)?.start ?? 0) - (parseTimeslot(b.time)?.start ?? 0);
      if (byStart !== 0) return byStart;
      return a.title.localeCompare(b.title);
    })
    .slice(0, limit);
};
