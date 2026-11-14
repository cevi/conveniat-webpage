import prisma from '@/lib/db/prisma';
import { CourseType } from '@/lib/prisma/enums';
import type { Payload } from 'payload';

/** A camp day as `YYYY-MM-DD`, in Zurich. */
export type CampDay = string;

/** A Schichteinsatz as the quotas see it: on which day, how many places, what it is called. */
export interface QuotaShift {
  id: string;
  title: string;
  day: CampDay;
  time: string;
  /** undefined when the shift takes any number of helpers */
  places: number | undefined;
}

/** The Zurich calendar day a stored shift date falls on. */
export const zurichDayOf = (value: string): CampDay =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Zurich' }).format(new Date(value));

/** A `@db.Date` column as Prisma hands it out: midnight UTC of the day. */
const dayOfDate = (value: Date): CampDay => value.toISOString().slice(0, 10);
const dateOfDay = (day: CampDay): Date => new Date(`${day}T00:00:00.000Z`);

/** Every Schichteinsatz, in German, with its Zurich day. */
export const listQuotaShifts = async (payload: Pick<Payload, 'find'>): Promise<QuotaShift[]> => {
  const { docs } = await payload.find({
    collection: 'helper-shifts',
    locale: 'de',
    depth: 0,
    pagination: false,
    overrideAccess: true,
    select: { title: true, timeslot: true, participants_max: true },
  });
  return docs.map((shift) => ({
    id: String(shift.id),
    title: String(shift.title),
    day: zurichDayOf(shift.timeslot.date),
    time: shift.timeslot.time,
    places: typeof shift.participants_max === 'number' ? shift.participants_max : undefined,
  }));
};

/** The quotas of every Hof, keyed `hofId → day → slots`. */
export const loadQuotas = async (
  hofIds?: readonly string[],
): Promise<Map<string, Map<CampDay, number>>> => {
  const rows = await prisma.hofShiftQuota.findMany({
    ...(hofIds === undefined ? {} : { where: { hofId: { in: [...hofIds] } } }),
    select: { hofId: true, day: true, slots: true },
  });
  const quotas = new Map<string, Map<CampDay, number>>();
  for (const row of rows) {
    const ofHof = quotas.get(row.hofId) ?? new Map<CampDay, number>();
    ofHof.set(dayOfDate(row.day), row.slots);
    quotas.set(row.hofId, ofHof);
  }
  return quotas;
};

/** One cell of the grid: a number sets the quota, `null` removes it. */
export interface QuotaChange {
  hofId: string;
  day: CampDay;
  slots: number | null;
}

/** Writes the changed cells of the grid in one transaction. */
export const saveQuotas = async (
  changes: readonly QuotaChange[],
  updatedBy: string | undefined,
): Promise<void> => {
  await prisma.$transaction(
    changes.map((change) => {
      const key = { hofId_day: { hofId: change.hofId, day: dateOfDay(change.day) } };
      return change.slots === null
        ? prisma.hofShiftQuota.deleteMany({
            where: { hofId: change.hofId, day: dateOfDay(change.day) },
          })
        : prisma.hofShiftQuota.upsert({
            where: key,
            update: { slots: change.slots, updatedBy: updatedBy ?? null },
            create: {
              hofId: change.hofId,
              day: dateOfDay(change.day),
              slots: change.slots,
              updatedBy: updatedBy ?? null,
            },
          });
    }),
  );
};

/** A shift enrolment that counts for a Hof, with what the AVP sees of it. */
export interface HofEnrolment {
  hofId: string;
  shiftId: string;
  userId: string;
  userName: string;
  createdAt: Date;
  /** what the Schichtleitung marked, `null` until they did */
  attendance: 'PRESENT' | 'ABSENT' | null;
}

/** The shift enrolments that count for the given Höfe, or for any Hof without a filter. */
export const listHofEnrolments = async (hofIds?: readonly string[]): Promise<HofEnrolment[]> => {
  const rows = await prisma.enrollment.findMany({
    where: {
      courseType: CourseType.SHIFT,
      hofId: hofIds === undefined ? { not: null } : { in: [...hofIds] },
    },
    select: {
      hofId: true,
      courseId: true,
      userId: true,
      createdAt: true,
      attendance: true,
      user: { select: { name: true } },
    },
    orderBy: { createdAt: 'asc' },
  });
  return rows.flatMap((row) =>
    row.hofId === null
      ? []
      : [
          {
            hofId: row.hofId,
            shiftId: row.courseId,
            userId: row.userId,
            userName: row.user.name,
            createdAt: row.createdAt,
            attendance: row.attendance,
          },
        ],
  );
};
