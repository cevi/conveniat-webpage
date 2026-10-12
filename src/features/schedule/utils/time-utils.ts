/**
 * Parses a time string (e.g., "9:00" or "09:30") into minutes from midnight.
 */
export const parseTimeToMinutes = (timeString: string): number => {
  const [hours = 0, minutes = 0] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
};

/**
 * Checks if two time slots on the same date overlap.
 * Time format: "HH:MM - HH:MM" (e.g., "09:00 - 10:30")
 */
export const isOverlapping = (
  time1: string,
  date1: string,
  time2: string,
  date2: string,
): boolean => {
  if (date1 !== date2) return false;
  const [start1String, end1String] = time1.split(' - ').map((t) => t.trim());
  const [start2String, end2String] = time2.split(' - ').map((t) => t.trim());
  if (!start1String || !end1String || !start2String || !end2String) return false;

  const start1 = parseTimeToMinutes(start1String);
  const end1 = parseTimeToMinutes(end1String);
  const start2 = parseTimeToMinutes(start2String);
  const end2 = parseTimeToMinutes(end2String);

  return start1 < end2 && start2 < end1;
};

/** Whether an ISO date falls on the calendar day of `now`, in the timezone of the reader. */
export const isSameDay = (isoDate: string, now: Date): boolean => {
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
export const parseTimeslot = (time: string): { start: number; end: number } | undefined => {
  const [startString, endString] = time.split(' - ').map((part) => part.trim());
  if (startString === undefined || startString === '') return undefined;

  const start = parseTimeToMinutes(startString);
  const end = endString === undefined ? start : parseTimeToMinutes(endString);
  if (Number.isNaN(start) || Number.isNaN(end)) return undefined;

  return { start, end };
};

/** `75` -> `"01:15"`. Minutes past midnight wrap, so a step at 24:10 reads `"00:10"`. */
export const formatMinutesAsTime = (minutes: number): string => {
  const ofDay = ((minutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(ofDay / 60)).padStart(2, '0')}:${String(ofDay % 60).padStart(2, '0')}`;
};

/** `45` -> `"45 min"`, `120` -> `"2 h"`, `90` -> `"1 h 30 min"`. */
export const formatDuration = (minutes: number): string => {
  if (minutes < 60) return `${minutes} min`;
  const rest = minutes % 60;
  return rest === 0 ? `${minutes / 60} h` : `${Math.floor(minutes / 60)} h ${rest} min`;
};

/**
 * The calendar day the programme files an entry under, as `YYYY-MM-DD`. The date carousel
 * groups by the same key, so "today" and the selected day cannot disagree.
 */
export const dayKeyOf = (date: Date | string): string => {
  const parsed = typeof date === 'string' ? new Date(date) : date;
  return Number.isNaN(parsed.getTime()) ? '' : (parsed.toISOString().split('T')[0] ?? '');
};

/** The day it is for the reader, as `YYYY-MM-DD` in their own timezone. */
export const todayKeyOf = (now: Date): string =>
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
