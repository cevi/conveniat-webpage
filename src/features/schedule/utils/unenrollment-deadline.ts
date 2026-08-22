import { parseTimeToMinutes } from '@/features/schedule/utils/time-utils';

/**
 * How long before a shift starts helpers stop being able to withdraw from it, unless the shift
 * says otherwise. Used both as the Payload field default for new shifts and as the fallback for
 * the shifts that were saved before the field existed and therefore carry no value at all.
 */
export const DEFAULT_UNENROLLMENT_DEADLINE_MINUTES = 30;

/**
 * The camp - and with it every clock a helper reads a shift on - runs on Swiss local time.
 *
 * A timeslot carries a calendar day and a wall-clock time, never a real instant, so the two only
 * become comparable to `now` once they are anchored in this timezone. Anchoring them in the
 * server's timezone instead would move every deadline by the UTC offset - two hours in summer,
 * which is four times the window this whole feature is about.
 */
export const CAMP_TIME_ZONE = 'Europe/Zurich';

const MILLISECONDS_PER_MINUTE = 60_000;

interface CampWallClock {
  year: number;
  month: number;
  day: number;
  minutesFromMidnight: number;
}

const campWallClockFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: CAMP_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** What a clock in the camp's timezone shows at `instant`. */
const readCampWallClock = (instant: number): CampWallClock => {
  const parts: Partial<Record<Intl.DateTimeFormatPartTypes, string>> = {};
  for (const part of campWallClockFormatter.formatToParts(new Date(instant))) {
    parts[part.type] = part.value;
  }

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    minutesFromMidnight: Number(parts.hour) * 60 + Number(parts.minute),
  };
};

/** How far ahead of UTC the camp's timezone runs at `instant`, in milliseconds. */
const campOffsetAt = (instant: number): number => {
  const wallClock = readCampWallClock(instant);
  const asIfUtc = Date.UTC(
    wallClock.year,
    wallClock.month - 1,
    wallClock.day,
    0,
    wallClock.minutesFromMidnight,
  );
  // the wall clock is only read down to the minute, so compare it against a minute-floored instant
  return asIfUtc - Math.floor(instant / MILLISECONDS_PER_MINUTE) * MILLISECONDS_PER_MINUTE;
};

/**
 * The instant at which the camp's clocks show the given day and time of day.
 *
 * The offset that applies is the one in effect at the resulting instant, not at the same wall
 * clock read as UTC, so the guess is made once and then corrected with the offset it lands in.
 * That is what keeps the two DST switches of the year from being off by an hour.
 */
const campWallClockToInstant = (
  year: number,
  month: number,
  day: number,
  minutesFromMidnight: number,
): number => {
  const asIfUtc = Date.UTC(year, month - 1, day, 0, minutesFromMidnight);
  const firstGuess = asIfUtc - campOffsetAt(asIfUtc);
  return asIfUtc - campOffsetAt(firstGuess);
};

export interface ShiftTimeslot {
  /** the ISO date of the day the shift is on, as Payload stores its date fields */
  date: string;
  /** the timeslot as the admin panel validates it, `"HH:mm - HH:mm"` */
  time: string;
}

/**
 * The instant a shift starts, or `undefined` when its timeslot cannot be read.
 *
 * A timeslot that does not parse yields no start and therefore no deadline: an unreadable slot
 * must not be what locks a helper into a shift they can no longer get out of.
 */
export const getShiftStart = (timeslot: ShiftTimeslot): Date | undefined => {
  const startOfSlot = timeslot.time.split(' - ')[0]?.trim();
  if (startOfSlot === undefined || startOfSlot === '') return undefined;

  const minutesFromMidnight = parseTimeToMinutes(startOfSlot);
  if (Number.isNaN(minutesFromMidnight)) return undefined;

  const day = new Date(timeslot.date);
  if (Number.isNaN(day.getTime())) return undefined;

  // read on a camp clock rather than in UTC: whether Payload stored the day as midnight UTC or as
  // midnight in Zurich, the calendar day the admin picked is the one a Swiss clock shows for it
  const campDay = readCampWallClock(day.getTime());

  return new Date(
    campWallClockToInstant(campDay.year, campDay.month, campDay.day, minutesFromMidnight),
  );
};

/**
 * The last instant at which a helper may still withdraw from a shift.
 *
 * `undefined` means the shift has no deadline at all - either because the timeslot is unreadable,
 * or because an admin deliberately set the window to zero.
 */
export const getUnenrollmentDeadline = (
  timeslot: ShiftTimeslot,
  deadlineMinutes: number | null | undefined,
): Date | undefined => {
  const minutes = deadlineMinutes ?? DEFAULT_UNENROLLMENT_DEADLINE_MINUTES;
  if (!Number.isFinite(minutes) || minutes <= 0) return undefined;

  const start = getShiftStart(timeslot);
  if (start === undefined) return undefined;

  return new Date(start.getTime() - minutes * MILLISECONDS_PER_MINUTE);
};

/**
 * The message the withdrawal guard rejects with.
 *
 * It travels to the client as the tRPC error message, which is the only part of a rejected
 * mutation the browser gets to see, so the client matches on it to tell "you are too late" apart
 * from a genuine failure. It is deliberately not user-facing text - the wording the helper reads
 * is localized in the component.
 */
export const UNENROLLMENT_DEADLINE_PASSED = 'UNENROLLMENT_DEADLINE_PASSED';

/** Whether the withdrawal window of a shift has already closed at `now`. */
export const isUnenrollmentClosed = (
  deadline: Date | string | null | undefined,
  now: Date = new Date(),
): boolean => {
  // a client restoring a persisted status from before this field existed has no deadline at all,
  // and a shift without one is simply not restricted
  if (deadline == undefined) return false;

  const deadlineTime = typeof deadline === 'string' ? Date.parse(deadline) : deadline.getTime();
  if (Number.isNaN(deadlineTime)) return false;

  return now.getTime() >= deadlineTime;
};
