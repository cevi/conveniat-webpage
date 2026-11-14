import {
  hasAccessToThisUser,
  HELPER_SHIFT_ROLES,
} from '@/features/payload-cms/payload-cms/access-rules/roles';
import type { HelperShift } from '@/features/payload-cms/payload-types';
import { scheduleError } from '@/features/schedule/api/schedule-errors';
import { isOrganiserOf } from '@/features/schedule/utils/organiser-check';
import { getShiftEnd, getShiftStart } from '@/features/schedule/utils/unenrollment-deadline';
import type { PrismaClient } from '@/lib/prisma/client';
import { CourseType, ShiftAttendance } from '@/lib/prisma/enums';
import { invariantError } from '@/trpc/error-formatter';
import type { HitobitoNextAuthUser } from '@/types/hitobito-next-auth-user';
import type { Payload } from 'payload';

/** Marking opens this long before the shift starts, when the first helpers arrive. */
const OPENS_BEFORE_START_MS = 30 * 60_000;
/** and closes this long after it ended, for a Schichtleitung that marks once back at the tent */
const CLOSES_AFTER_END_MS = 24 * 60 * 60_000;

type RosterPrisma = Pick<PrismaClient, 'enrollment' | 'user'>;

/** When the Schichtleitung may mark who came, or `undefined` for an unreadable time slot. */
export const getAttendanceWindow = (
  shift: Pick<HelperShift, 'timeslot'>,
): { opensAt: Date; closesAt: Date } | undefined => {
  const timeslot = { date: String(shift.timeslot.date), time: String(shift.timeslot.time) };
  const start = getShiftStart(timeslot);
  const end = getShiftEnd(timeslot);
  if (start === undefined || end === undefined) return undefined;
  return {
    opensAt: new Date(start.getTime() - OPENS_BEFORE_START_MS),
    closesAt: new Date(end.getTime() + CLOSES_AFTER_END_MS),
  };
};

/** Whether the shift has ended, after which a no-show no longer counts for the Hof. */
export const hasShiftEnded = (shift: Pick<HelperShift, 'timeslot'>, now: Date): boolean => {
  const end = getShiftEnd({
    date: String(shift.timeslot.date),
    time: String(shift.timeslot.time),
  });
  return end !== undefined && end <= now;
};

/** The Helferpool, the admins and the web core team see every roster and correct it any time. */
const plansShifts = (user: HitobitoNextAuthUser): boolean =>
  hasAccessToThisUser({ user, requiredRoles: HELPER_SHIFT_ROLES });

/**
 * Who leads the shift on site: its Schichtleitung, and whoever plans the shifts. Anybody else
 * never reaches the roster in our client, so a call from them is a bug or someone probing.
 */
export const assertLeadsShift = (user: HitobitoNextAuthUser, shift: HelperShift): void => {
  if (shift.hide_participant_list === true && !plansShifts(user)) {
    // the roster stays in the admin panel for a shift that hides it, see the field
    throw invariantError('FORBIDDEN', 'The roster of this shift is hidden');
  }
  if (!isOrganiserOf(shift.organiser, user.uuid) && !plansShifts(user)) {
    throw invariantError('FORBIDDEN', 'Only the Schichtleitung reads the roster of a shift');
  }
};

/**
 * Refuses a mark outside the window. The Helferpool corrects any time. A Schichtleitung whose
 * mark comes in late, from the offline outbox replaying it after the window closed, is told so.
 */
const assertWindowIsOpen = (user: HitobitoNextAuthUser, shift: HelperShift, now: Date): void => {
  if (plansShifts(user)) return;
  const window = getAttendanceWindow(shift);
  if (window === undefined || now < window.opensAt || now > window.closesAt) {
    throw scheduleError('BAD_REQUEST', 'attendanceWindowClosed');
  }
};

export type AttendanceMark = 'PRESENT' | 'ABSENT';

/** One person on the roster of a shift, as the Schichtleitung sees them. */
export interface RosterEntry {
  userId: string;
  name: string;
  hofId: string | null;
  hofName: string | null;
  attendance: AttendanceMark | null;
  addedOnSite: boolean;
  enrolledAt: string;
}

export interface ShiftRoster {
  entries: RosterEntry[];
  /** absent for a time slot that cannot be read */
  window?: { opensAt: string; closesAt: string };
  /** the Helferpool may mark outside the window */
  canMarkAnyTime: boolean;
}

const hofNamesOf = async (
  payload: Pick<Payload, 'find'>,
  hofIds: string[],
): Promise<Map<string, string>> => {
  if (hofIds.length === 0) return new Map();
  const { docs } = await payload.find({
    collection: 'hoefe',
    where: { id: { in: hofIds } },
    depth: 0,
    pagination: false,
    overrideAccess: true,
    select: { name: true },
  });
  return new Map(docs.map((hof) => [String(hof.id), String(hof.name)]));
};

/** Who is enrolled in the shift, with their Hof and what was marked, by name. */
export const getShiftRoster = async (
  prisma: RosterPrisma,
  payload: Pick<Payload, 'find'>,
  user: HitobitoNextAuthUser,
  shift: HelperShift,
): Promise<ShiftRoster> => {
  assertLeadsShift(user, shift);
  const enrolments = await prisma.enrollment.findMany({
    where: { courseId: shift.id, courseType: CourseType.SHIFT },
    select: {
      userId: true,
      hofId: true,
      attendance: true,
      addedOnSite: true,
      createdAt: true,
      user: { select: { name: true } },
    },
  });
  const hofNames = await hofNamesOf(payload, [
    ...new Set(enrolments.flatMap((entry) => (entry.hofId === null ? [] : [entry.hofId]))),
  ]);
  const window = getAttendanceWindow(shift);
  return {
    entries: enrolments
      .map((entry) => ({
        userId: entry.userId,
        name: entry.user.name,
        hofId: entry.hofId,
        hofName: entry.hofId === null ? null : (hofNames.get(entry.hofId) ?? null),
        attendance: entry.attendance,
        addedOnSite: entry.addedOnSite,
        enrolledAt: entry.createdAt.toISOString(),
      }))
      .toSorted((a, b) => a.name.localeCompare(b.name, 'de')),
    ...(window === undefined
      ? {}
      : {
          window: {
            opensAt: window.opensAt.toISOString(),
            closesAt: window.closesAt.toISOString(),
          },
        }),
    canMarkAnyTime: plansShifts(user),
  };
};

/**
 * Marks whether a person came, or clears the mark. Setting a value rather than toggling one, so
 * a mark the offline outbox sends twice lands the same.
 */
export const setShiftAttendance = async (
  prisma: RosterPrisma,
  user: HitobitoNextAuthUser,
  shift: HelperShift,
  personId: string,
  mark: AttendanceMark | null,
  now: Date,
): Promise<void> => {
  assertLeadsShift(user, shift);
  assertWindowIsOpen(user, shift, now);
  const { count } = await prisma.enrollment.updateMany({
    where: { courseId: shift.id, courseType: CourseType.SHIFT, userId: personId },
    data: {
      attendance: mark === null ? null : ShiftAttendance[mark],
      attendanceAt: now,
      attendanceBy: user.uuid,
    },
  });
  // the person withdrew or was removed in the meantime; a stale roster said otherwise
  if (count === 0) throw scheduleError('BAD_REQUEST', 'notOnRoster');
};

/**
 * Adds someone who came without being enrolled, e.g. in the place of someone of their Hof, as
 * present. They count for their Hof like anybody enrolled: their only one, or none when they are
 * in several, since nobody on site asked them which. A full shift takes them anyway: they are
 * there.
 */
export const addShiftWalkIn = async (
  prisma: RosterPrisma,
  user: HitobitoNextAuthUser,
  shift: HelperShift,
  personId: string,
  now: Date,
): Promise<void> => {
  assertLeadsShift(user, shift);
  assertWindowIsOpen(user, shift, now);
  const person = await prisma.user.findUnique({
    where: { uuid: personId },
    select: { hofIds: true },
  });
  if (person === null) throw invariantError('NOT_FOUND', 'No such person');
  await prisma.enrollment.upsert({
    where: {
      courseId_courseType_userId: {
        courseId: shift.id,
        courseType: CourseType.SHIFT,
        userId: personId,
      },
    },
    // already enrolled: adding them on site only marks them present
    update: { attendance: ShiftAttendance.PRESENT, attendanceAt: now, attendanceBy: user.uuid },
    create: {
      courseId: shift.id,
      courseType: CourseType.SHIFT,
      userId: personId,
      hofId: person.hofIds.length === 1 ? (person.hofIds[0] ?? null) : null,
      addedOnSite: true,
      attendance: ShiftAttendance.PRESENT,
      attendanceAt: now,
      attendanceBy: user.uuid,
    },
  });
};

/** People the Schichtleitung can add on site, found by name; at most ten. */
export const searchWalkInCandidates = async (
  prisma: RosterPrisma,
  user: HitobitoNextAuthUser,
  shift: HelperShift,
  query: string,
): Promise<{ userId: string; name: string }[]> => {
  assertLeadsShift(user, shift);
  const words = query
    .trim()
    .split(/\s+/)
    .filter((word) => word.length >= 2);
  if (words.length === 0) return [];
  const people = await prisma.user.findMany({
    where: {
      AND: words.map((word) => ({ name: { contains: word, mode: 'insensitive' as const } })),
    },
    select: { uuid: true, name: true },
    orderBy: { name: 'asc' },
    take: 10,
  });
  return people.map((person) => ({ userId: person.uuid, name: person.name }));
};
