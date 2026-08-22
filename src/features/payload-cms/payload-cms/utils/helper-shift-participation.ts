/**
 * Aggregation logic behind the "Schichteinsätze" participation export.
 *
 * The export answers a single question: who helped, for how many hours, and in which shifts.
 * All of the logic here is pure so that it can be unit tested without a Payload or Prisma
 * instance; the endpoint in `endpoints/helper-shift-participation-export.ts` is only
 * responsible for loading the data and turning the resulting rows into a workbook.
 */

/** A helper shift, reduced to the fields the export needs. */
export interface HelperShiftSummary {
  id: string;
  /** Localized shift title; falsy when the shift has no title in the requested locale. */
  title?: string | null | undefined;
  /** Date of the shift (`YYYY-MM-DD` or an ISO timestamp), used to order the title list. */
  date?: string | null | undefined;
  /** Time slot in `HH:mm - HH:mm` format, e.g. `12:00 - 14:00`. */
  time?: string | null | undefined;
}

/** A single enrollment of a user into a helper shift. */
export interface HelperShiftEnrollment {
  userId: string;
  courseId: string;
}

/** A user, reduced to the fields the export needs. */
export interface HelperShiftParticipant {
  id: string;
  fullName?: string | null | undefined;
  nickname?: string | null | undefined;
}

/** One row of the participation export. */
export interface HelperShiftParticipationRow {
  userId: string;
  firstName: string;
  lastName: string;
  nickname: string;
  /** Sum of the durations of all shifts the user is enrolled in, in hours. */
  totalHours: number;
  /** Number of shifts the user is enrolled in. */
  shiftCount: number;
  /** Titles of those shifts, chronologically ordered and comma separated. */
  shiftTitles: string;
}

const MINUTES_PER_HOUR = 60;
const MINUTES_PER_DAY = 24 * MINUTES_PER_HOUR;

/** `HH:mm - HH:mm`, tolerating arbitrary whitespace around the separator. */
const TIME_SLOT_PATTERN = /^\s*([01]?\d|2[0-3]):([0-5]\d)\s*-\s*([01]?\d|2[0-3]):([0-5]\d)\s*$/;

/**
 * Name particles that belong to the last name rather than the first name
 * ("Hans von Gunten" → "Hans" / "von Gunten").
 */
const LAST_NAME_PARTICLES = new Set([
  'da',
  'dal',
  'de',
  'del',
  'della',
  'den',
  'der',
  'di',
  'do',
  'dos',
  'du',
  'la',
  'le',
  'ten',
  'ter',
  'van',
  'von',
  'zu',
  'zum',
  'zur',
]);

/**
 * Duration of a `HH:mm - HH:mm` time slot in hours.
 *
 * A slot that ends before it starts is treated as crossing midnight (`22:00 - 02:00` → 4h).
 * Unparsable slots contribute nothing and yield `0`.
 */
export const parseTimeSlotHours = (timeSlot: string | null | undefined): number => {
  if (typeof timeSlot !== 'string') return 0;

  const match = TIME_SLOT_PATTERN.exec(timeSlot);
  if (match === null) return 0;

  const [, startHour, startMinute, endHour, endMinute] = match;
  const start = Number(startHour) * MINUTES_PER_HOUR + Number(startMinute);
  const end = Number(endHour) * MINUTES_PER_HOUR + Number(endMinute);

  const minutes = end >= start ? end - start : end - start + MINUTES_PER_DAY;

  return minutes / MINUTES_PER_HOUR;
};

/**
 * Splits a full name into first and last name.
 *
 * Payload only stores the concatenated `fullName` (`first_name + ' ' + last_name` as delivered by
 * Hitobito), so the split is a heuristic: the last token is the last name, extended to the left
 * over any name particle such as "von" or "de".
 */
export const splitFullName = (
  fullName: string | null | undefined,
): { firstName: string; lastName: string } => {
  const tokens = (fullName ?? '').trim().split(/\s+/).filter(Boolean);

  if (tokens.length === 0) return { firstName: '', lastName: '' };
  if (tokens.length === 1) return { firstName: '', lastName: tokens[0] ?? '' };

  // Walk left from the last token for as long as we keep seeing particles; never consume the
  // first token, so that a first name always remains.
  let lastNameStart = tokens.length - 1;
  while (
    lastNameStart > 1 &&
    LAST_NAME_PARTICLES.has((tokens[lastNameStart - 1] ?? '').toLowerCase())
  ) {
    lastNameStart -= 1;
  }

  return {
    firstName: tokens.slice(0, lastNameStart).join(' '),
    lastName: tokens.slice(lastNameStart).join(' '),
  };
};

/** Sort key that orders shifts chronologically, putting undated shifts last. */
const shiftSortKey = (shift: HelperShiftSummary): string =>
  `${shift.date ?? '￿'}T${shift.time ?? '￿'}`;

/**
 * Builds one export row per user that is enrolled in at least one of the given shifts.
 *
 * Enrollments pointing at a shift that is not in `shifts` (deleted or trashed shifts) are ignored,
 * as are enrollments of users that could not be resolved. Rows are sorted by last name, then first
 * name, so the workbook is readable without further sorting.
 */
export const aggregateHelperShiftParticipation = ({
  shifts,
  enrollments,
  participants,
}: {
  shifts: HelperShiftSummary[];
  enrollments: HelperShiftEnrollment[];
  participants: HelperShiftParticipant[];
}): HelperShiftParticipationRow[] => {
  const shiftsById = new Map(shifts.map((shift) => [shift.id, shift]));
  const participantsById = new Map(
    participants.map((participant) => [participant.id, participant]),
  );

  const shiftsPerUser = new Map<string, HelperShiftSummary[]>();

  for (const enrollment of enrollments) {
    const shift = shiftsById.get(enrollment.courseId);
    if (shift === undefined) continue;
    if (!participantsById.has(enrollment.userId)) continue;

    const userShifts = shiftsPerUser.get(enrollment.userId);
    if (userShifts === undefined) {
      shiftsPerUser.set(enrollment.userId, [shift]);
    } else {
      userShifts.push(shift);
    }
  }

  const rows: HelperShiftParticipationRow[] = [];

  for (const [userId, userShifts] of shiftsPerUser) {
    const participant = participantsById.get(userId);
    const { firstName, lastName } = splitFullName(participant?.fullName);

    const orderedShifts = [...userShifts].sort((a, b) =>
      shiftSortKey(a).localeCompare(shiftSortKey(b)),
    );

    const totalMinutes = orderedShifts.reduce(
      (sum, shift) => sum + parseTimeSlotHours(shift.time) * MINUTES_PER_HOUR,
      0,
    );

    rows.push({
      userId,
      firstName,
      lastName,
      nickname: participant?.nickname ?? '',
      // Sum in minutes and convert once, so that half-hour slots do not accumulate float noise.
      totalHours: Math.round((totalMinutes / MINUTES_PER_HOUR) * 100) / 100,
      shiftCount: orderedShifts.length,
      shiftTitles: orderedShifts
        .map((shift) => (shift.title ?? '').trim())
        .filter((title) => title !== '')
        .join(', '),
    });
  }

  return rows.sort((a, b) => {
    const byLastName = a.lastName.localeCompare(b.lastName, 'de');
    if (byLastName !== 0) return byLastName;
    return a.firstName.localeCompare(b.firstName, 'de');
  });
};
