import type { PrismaClient } from '@/lib/prisma';
import { CourseType } from '@/lib/prisma';
import config from '@payload-config';
import { getPayload } from 'payload';

/**
 * Organisers are a handful of people per entry and nobody organises the whole camp, so a
 * generous single page is enough to never paginate in practice.
 */
const ORGANISED_ENTRIES_LIMIT = 1000;

const findOrganisedIds = async (
  collection: 'camp-schedule-entry' | 'helper-shifts',
  userId: string,
): Promise<string[]> => {
  if (userId === '') return [];

  const payload = await getPayload({ config });

  const result = await payload.find({
    collection,
    where: { organiser: { in: [userId] } },
    depth: 0,
    limit: ORGANISED_ENTRIES_LIMIT,
    // only the IDs are needed; `title` keeps the payload small without fighting the type
    select: { title: true },
  });

  return result.docs.map((document_) => String(document_.id));
};

/**
 * IDs of the schedule entries (workshops, program blocks) the user is an organiser of.
 */
export const getOrganisedCourseIds = async (userId: string): Promise<string[]> =>
  findOrganisedIds('camp-schedule-entry', userId);

/**
 * IDs of the helper shifts (Schichteinsätze) the user is an organiser of.
 */
export const getOrganisedShiftIds = async (userId: string): Promise<string[]> =>
  findOrganisedIds('helper-shifts', userId);

/**
 * Stars every schedule entry the user organises on their behalf.
 *
 * Organisers have to see their own block in "Programm von heute" whether or not they ever
 * enrolled in it or hit the star themselves. Rather than teaching every consumer of the star
 * set about organiser-ship, the star is simply materialised here - the dashboard, the schedule
 * list and the offline cache then all treat it like any other star.
 *
 * Called from the star sync the client runs on every session, so entries that gained an
 * organiser after the fact are picked up too, without a migration.
 *
 * Un-starring is deliberately not sticky: the next sync re-creates the star. A course an
 * organiser truly does not want in their program is one they should hand over in the CMS.
 */
export const ensureOrganiserStars = async (
  prisma: PrismaClient,
  userId: string,
): Promise<string[]> => {
  try {
    const courseIds = await getOrganisedCourseIds(userId);
    if (courseIds.length === 0) return [];

    await prisma.star.createMany({
      data: courseIds.map((courseId) => ({
        courseId,
        userId,
        courseType: CourseType.PROGRAM,
      })),
      skipDuplicates: true,
    });

    return courseIds;
  } catch (error) {
    // a failure here must not take the star sync down with it
    console.warn('[ensureOrganiserStars] Could not star organised courses:', error);
    return [];
  }
};
