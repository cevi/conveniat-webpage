import type {
  CampCategory,
  CampMapAnnotation,
  HelperShift,
} from '@/features/payload-cms/payload-types';
import prisma from '@/lib/db/prisma';
import { getFeatureFlag } from '@/lib/db/redis';
import { FEATURE_FLAG_HIDE_FULL_HELPER_SHIFTS } from '@/lib/feature-flags';
import type { PrismaClient } from '@/lib/prisma';
import { CourseType } from '@/lib/prisma';
import type { Locale } from '@/types/types';
import { getLocaleFromCookies } from '@/utils/get-locale-from-cookies';
import { forceDynamicOnBuild } from '@/utils/is-pre-rendering';
import config from '@payload-config';
import { cacheLife, cacheTag } from 'next/cache';
import type { Where } from 'payload';
import { getPayload } from 'payload';

export interface HelperShiftOrganiser {
  id: string;
  fullName: string;
  /**
   * The Ceviname, optional because most users never set one - and because a shift restored
   * from a persisted query cache written before this field existed simply has no value here.
   */
  nickname?: string | null | undefined;
  email: string;
}

export interface HelperShiftFrontendType {
  id: string;
  title: string;
  description: string;
  meetingPoint?: string | undefined;
  timeslot: {
    date: string;
    time: string;
  };
  // relationships can be unpopulated (ID string) or dangling (null) at runtime
  location?: string | CampMapAnnotation | null | undefined;
  category?: string | CampCategory | null | undefined;
  organiser: HelperShiftOrganiser[];
  participants_max?: number | undefined;
  enable_enrolment?: boolean | undefined;
  hide_participant_list?: boolean | undefined;
  hide_when_full?: boolean | undefined;
  mainContent?: unknown;
}

/**
 * Narrows the populated organiser relationship down to the few fields the helper portal
 * renders. The rest of the user document - roles, the Hitobito payload, everything the admin
 * panel keeps - must not ride along: this result is shared cache, handed to every helper.
 *
 * Entries that are still ID strings are dropped rather than rendered as a nameless contact
 * row - that is also how a relationship pointing at a deleted user comes back, so a stale
 * organiser drops out of the card instead of showing a chat button that goes nowhere.
 */
const toOrganisers = (organiser: HelperShift['organiser']): HelperShiftOrganiser[] =>
  (organiser ?? []).flatMap((entry) =>
    typeof entry === 'string'
      ? []
      : [{ id: entry.id, fullName: entry.fullName, nickname: entry.nickname, email: entry.email }],
  );

const getHelperShiftsCached = async (
  where: Where = {},
  locale: Locale,
): Promise<HelperShiftFrontendType[]> => {
  'use cache';
  cacheLife('minutes');
  cacheTag('payload', 'collection:helper-shifts', 'helper-shifts');

  const payload = await getPayload({ config });

  const shifts = await payload.find({
    collection: 'helper-shifts',
    locale: locale,
    fallbackLocale: 'de',
    depth: 1,
    where: where,
    limit: 99_999,
  });

  return shifts.docs
    .map((document_) => ({
      id: String(document_.id),
      title: String(document_.title),
      description: typeof document_.description === 'string' ? document_.description : '',
      meetingPoint:
        document_.meetingPoint != undefined && typeof document_.meetingPoint === 'string'
          ? document_.meetingPoint
          : undefined,
      timeslot: {
        date: String(document_.timeslot.date),
        time: String(document_.timeslot.time),
      },
      location: document_.location,
      category: document_.category,
      organiser: toOrganisers(document_.organiser),
      participants_max:
        typeof document_.participants_max === 'number' ? document_.participants_max : undefined,
      enable_enrolment:
        typeof document_.enable_enrolment === 'boolean' ? document_.enable_enrolment : undefined,
      hide_participant_list:
        typeof document_.hide_participant_list === 'boolean'
          ? document_.hide_participant_list
          : undefined,
      hide_when_full:
        typeof document_.hide_when_full === 'boolean' ? document_.hide_when_full : undefined,
      mainContent: document_.mainContent,
    }))
    .sort((a, b) => {
      const dateA = new Date(a.timeslot.date).getTime();
      const dateB = new Date(b.timeslot.date).getTime();
      if (dateA !== dateB) return dateA - dateB;
      const timeA = a.timeslot.time.split(' - ')[0] ?? '00:00';
      const timeB = b.timeslot.time.split(' - ')[0] ?? '00:00';
      return timeA.localeCompare(timeB);
    });
};

export interface GetHelperShiftsContext {
  prisma?: PrismaClient | undefined;
  user?: { uuid: string } | null | undefined;
}

export const getHelperShifts = async (
  where: Where = {},
  locale?: Locale,
  ctx?: GetHelperShiftsContext,
): Promise<HelperShiftFrontendType[]> => {
  if (await forceDynamicOnBuild()) return [];

  const currentLocale = locale ?? (await getLocaleFromCookies());
  const shifts = await getHelperShiftsCached(where, currentLocale);

  const isHideFullEnabled = await getFeatureFlag(FEATURE_FLAG_HIDE_FULL_HELPER_SHIFTS);
  if (!isHideFullEnabled) {
    return shifts;
  }

  const candidateShifts = shifts.filter(
    (shift) =>
      shift.participants_max != undefined &&
      shift.participants_max > 0 &&
      shift.hide_when_full !== false,
  );

  if (candidateShifts.length === 0) {
    return shifts;
  }

  const prismaInstance = ctx?.prisma ?? prisma;
  const candidateIds = candidateShifts.map((shift) => shift.id);

  const counts = await prismaInstance.enrollment.groupBy({
    by: ['courseId'],
    where: {
      courseId: { in: candidateIds },
      courseType: CourseType.SHIFT,
    },
    _count: {
      courseId: true,
    },
  });

  const enrolledCountMap = new Map<string, number>();
  for (const countItem of counts) {
    enrolledCountMap.set(countItem.courseId, countItem._count.courseId);
  }

  const fullShiftIds = new Set<string>();
  for (const shift of candidateShifts) {
    const count = enrolledCountMap.get(shift.id) ?? 0;
    if (shift.participants_max != undefined && count >= shift.participants_max) {
      fullShiftIds.add(shift.id);
    }
  }

  if (fullShiftIds.size === 0) {
    return shifts;
  }

  const userId = typeof ctx?.user?.uuid === 'string' ? ctx.user.uuid : undefined;
  let userEnrolledShiftIds = new Set<string>();

  if (typeof userId === 'string' && userId !== '') {
    const userEnrollments = await prismaInstance.enrollment.findMany({
      where: {
        userId,
        courseType: CourseType.SHIFT,
        courseId: { in: [...fullShiftIds] },
      },
      select: { courseId: true },
    });
    userEnrolledShiftIds = new Set(userEnrollments.map((enrollment_) => enrollment_.courseId));
  }

  return shifts.filter(
    (shift) => !fullShiftIds.has(shift.id) || userEnrolledShiftIds.has(shift.id),
  );
};
