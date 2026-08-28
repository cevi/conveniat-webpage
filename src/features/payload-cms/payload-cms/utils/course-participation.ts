/**
 * Aggregation logic behind the participation exports of the two course collections
 * (`helper-shifts` and `camp-schedule-entry`).
 *
 * The exports all answer the same question for a different group of people: who was involved, for
 * how many hours, and in which courses. Enrolled helpers come from the Prisma enrollments, while
 * organisers come from the `organiser` relation on the Payload document — but once the assignments
 * are collected, the aggregation is identical, so all exports share the code below.
 *
 * All of the logic here is pure so that it can be unit tested without a Payload or Prisma
 * instance; the endpoints in `endpoints/` are only responsible for loading the data and turning
 * the resulting rows into a workbook.
 */

/** A course — a helper shift or a camp schedule entry — reduced to the fields the export needs. */
export interface CourseSummary {
  id: string;
  /** Localized course title; falsy when the course has no title in the requested locale. */
  title?: string | null | undefined;
  /** Date of the course (`YYYY-MM-DD` or an ISO timestamp), used to order the title list. */
  date?: string | null | undefined;
  /** Time slot in `HH:mm - HH:mm` format, e.g. `12:00 - 14:00`. */
  time?: string | null | undefined;
}

/** A single assignment of a user to a course — either an enrollment or an organiser relation. */
export interface CourseAssignment {
  userId: string;
  courseId: string;
}

/** A user, reduced to the fields the export needs. */
export interface CourseParticipant {
  id: string;
  fullName?: string | null | undefined;
  nickname?: string | null | undefined;
  email?: string | null | undefined;
}

/** One row of a participation export. */
export interface CourseParticipationRow {
  userId: string;
  firstName: string;
  lastName: string;
  nickname: string;
  email: string;
  /** Sum of the durations of all courses the user is assigned to, in hours. */
  totalHours: number;
  /** Number of courses the user is assigned to. */
  courseCount: number;
  /** Titles of those courses, chronologically ordered and comma separated. */
  courseTitles: string;
}

/**
 * A course document as loaded from Payload with `depth: 0`, reduced to the fields the organiser
 * export needs. Both `helper-shifts` and `camp-schedule-entry` documents match this shape.
 */
export interface CourseOrganiserDocument {
  id: string;
  title?: string | null | undefined;
  timeslot?: { date?: string | null | undefined; time?: string | null | undefined } | null;
  /** Organiser relation; string ids with `depth: 0`, populated user objects otherwise. */
  organiser?: (string | { id: string })[] | null | undefined;
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

/** Sort key that orders courses chronologically, putting undated courses last. */
const courseSortKey = (course: CourseSummary): string =>
  `${course.date ?? '￿'}T${course.time ?? '￿'}`;

/**
 * Turns Payload course documents into the courses and organiser assignments the aggregation
 * expects.
 *
 * A user listed twice on the same document only counts once, so that a duplicated relation does
 * not double the organiser's hours.
 */
export const extractOrganiserAssignments = (
  documents: CourseOrganiserDocument[],
): { courses: CourseSummary[]; assignments: CourseAssignment[] } => {
  const courses: CourseSummary[] = [];
  const assignments: CourseAssignment[] = [];

  for (const document_ of documents) {
    courses.push({
      id: document_.id,
      title: document_.title,
      date: document_.timeslot?.date,
      time: document_.timeslot?.time,
    });

    const seenUserIds = new Set<string>();

    for (const organiser of document_.organiser ?? []) {
      const userId = typeof organiser === 'string' ? organiser : organiser.id;
      if (userId === '' || seenUserIds.has(userId)) continue;

      seenUserIds.add(userId);
      assignments.push({ userId, courseId: document_.id });
    }
  }

  return { courses, assignments };
};

/**
 * Builds one export row per user that is assigned to at least one of the given courses.
 *
 * Assignments pointing at a course that is not in `courses` (deleted or trashed courses) are
 * ignored, as are assignments of users that could not be resolved. Rows are sorted by last name,
 * then first name, so the workbook is readable without further sorting.
 */
export const aggregateCourseParticipation = ({
  courses,
  assignments,
  participants,
}: {
  courses: CourseSummary[];
  assignments: CourseAssignment[];
  participants: CourseParticipant[];
}): CourseParticipationRow[] => {
  const coursesById = new Map(courses.map((course) => [course.id, course]));
  const participantsById = new Map(
    participants.map((participant) => [participant.id, participant]),
  );

  const coursesPerUser = new Map<string, CourseSummary[]>();

  for (const assignment of assignments) {
    const course = coursesById.get(assignment.courseId);
    if (course === undefined) continue;
    if (!participantsById.has(assignment.userId)) continue;

    const userCourses = coursesPerUser.get(assignment.userId);
    if (userCourses === undefined) {
      coursesPerUser.set(assignment.userId, [course]);
    } else {
      userCourses.push(course);
    }
  }

  const rows: CourseParticipationRow[] = [];

  for (const [userId, userCourses] of coursesPerUser) {
    const participant = participantsById.get(userId);
    const { firstName, lastName } = splitFullName(participant?.fullName);

    const orderedCourses = [...userCourses].sort((a, b) =>
      courseSortKey(a).localeCompare(courseSortKey(b)),
    );

    const totalMinutes = orderedCourses.reduce(
      (sum, course) => sum + parseTimeSlotHours(course.time) * MINUTES_PER_HOUR,
      0,
    );

    rows.push({
      userId,
      firstName,
      lastName,
      nickname: participant?.nickname ?? '',
      email: participant?.email ?? '',
      // Sum in minutes and convert once, so that half-hour slots do not accumulate float noise.
      totalHours: Math.round((totalMinutes / MINUTES_PER_HOUR) * 100) / 100,
      courseCount: orderedCourses.length,
      courseTitles: orderedCourses
        .map((course) => (course.title ?? '').trim())
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
