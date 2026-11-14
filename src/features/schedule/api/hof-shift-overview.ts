import { listAvpHoefe } from '@/features/payload-cms/payload-cms/access-rules/accessible-hoefe';
import type { CampDay } from '@/features/payload-cms/payload-cms/utils/hof-shift-quotas';
import {
  listHofEnrolments,
  listQuotaShifts,
  loadQuotas,
} from '@/features/payload-cms/payload-cms/utils/hof-shift-quotas';
import type { HitobitoNextAuthUser } from '@/types/hitobito-next-auth-user';
import { createLogger } from '@/utils/server-logger';
import config from '@payload-config';
import { getPayload } from 'payload';

const logger = createLogger('schedule:hof-shifts');

/** One person of the Hof on one shift, as the AVP sees them. */
export interface HofShiftPerson {
  name: string;
  shiftId: string;
  shiftTitle: string;
  time: string;
  /** ISO timestamp of the enrolment */
  enrolledAt: string;
}

/** One camp day of a Hof: what it should take on and who of it enrolled. */
export interface HofShiftDay {
  day: CampDay;
  /** absent on a day the Helferpool set no quota for */
  quota?: number;
  enrolled: number;
  people: HofShiftPerson[];
}

export interface HofShiftOverview {
  /** the Höfe the user is AVP of; empty for everybody else, who sees no "Mein Hof" */
  hoefe: { id: string; name: string }[];
  /** the Hof shown, absent when the user is AVP of none */
  hofId?: string;
  days: HofShiftDay[];
}

/**
 * What the AVP of a Hof sees of its Schichteinsätze: per camp day the quota the Helferpool set,
 * how many enrolments of people of the Hof count towards it, and who enrolled for which shift
 * and when. A person who is AVP of several Höfe picks one; anyone else gets no Hof at all.
 */
export const getHofShiftOverview = async (
  user: HitobitoNextAuthUser,
  requestedHofId?: string,
): Promise<HofShiftOverview> => {
  const payload = await getPayload({ config });
  const hoefe = await listAvpHoefe(payload, user);
  const hof = hoefe.find((entry) => entry.id === requestedHofId) ?? hoefe[0];
  if (hof === undefined) return { hoefe: [], days: [] };

  const [shifts, quotas, enrolments] = await Promise.all([
    listQuotaShifts(payload),
    loadQuotas([hof.id]),
    listHofEnrolments([hof.id]),
  ]);
  const shiftById = new Map(shifts.map((shift) => [shift.id, shift]));
  const quotaOfDay = quotas.get(hof.id) ?? new Map<CampDay, number>();

  const days = new Map<CampDay, HofShiftDay>();
  const dayEntry = (day: CampDay): HofShiftDay => {
    const existing = days.get(day);
    if (existing !== undefined) return existing;
    const quota = quotaOfDay.get(day);
    const entry: HofShiftDay = {
      day,
      ...(quota === undefined ? {} : { quota }),
      enrolled: 0,
      people: [],
    };
    days.set(day, entry);
    return entry;
  };
  for (const day of quotaOfDay.keys()) dayEntry(day);
  for (const enrolment of enrolments) {
    const shift = shiftById.get(enrolment.shiftId);
    // an enrolment of a shift deleted since counts for nothing
    if (shift === undefined) continue;
    const entry = dayEntry(shift.day);
    entry.enrolled += 1;
    entry.people.push({
      name: enrolment.userName,
      shiftId: shift.id,
      shiftTitle: shift.title,
      time: shift.time,
      enrolledAt: enrolment.createdAt.toISOString(),
    });
  }
  for (const entry of days.values()) {
    entry.people.sort((a, b) => {
      const byTime = a.time.localeCompare(b.time);
      return byTime === 0 ? a.name.localeCompare(b.name) : byTime;
    });
  }

  logger.debug('Built the Schichteinsätze of a Hof for its AVP', {
    'hof_shifts.days': days.size,
    'hof_shifts.enrolments': enrolments.length,
  });
  return {
    hoefe: hoefe.map(({ id, name }) => ({ id, name })),
    hofId: hof.id,
    days: [...days.values()].toSorted((a, b) => a.day.localeCompare(b.day)),
  };
};
