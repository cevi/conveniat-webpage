import { scheduleError } from '@/features/schedule/api/schedule-errors';
import type { PrismaClient } from '@/lib/prisma/client';
import config from '@payload-config';
import { getPayload } from 'payload';

/** Inside a transaction or outside: all this file reads is the user mirror. */
type UserReader = Pick<PrismaClient, 'user'>;

/** A Hof the user is registered in, as the enrol sheet offers it. */
export interface EnrolmentHof {
  id: string;
  name: string;
}

/** The Höfe a user is registered in through Cevi.DB, as the Postgres mirror keeps them. */
const hofIdsOf = async (prisma: UserReader, userId: string): Promise<string[]> => {
  const user = await prisma.user.findUnique({ where: { uuid: userId }, select: { hofIds: true } });
  return user?.hofIds ?? [];
};

/**
 * The Hof a new shift enrolment counts for, stored on the enrolment so it keeps counting there
 * when the person's registration changes later.
 *
 * A person in one Hof counts for it without being asked, a person in none for no Hof. A person
 * in several picks one in the enrol sheet; a request without a pick, from a client that predates
 * the sheet or replays an old send, is refused with a reason the sheet then asks about. A pick of
 * a Hof the person is no longer in comes from a stale page and is refused the same way.
 */
export const resolveEnrolmentHof = async (
  prisma: UserReader,
  userId: string,
  requested?: string,
): Promise<string | null> => {
  const hofIds = await hofIdsOf(prisma, userId);
  if (requested !== undefined) {
    if (!hofIds.includes(requested)) throw scheduleError('BAD_REQUEST', 'notInThisHof');
    return requested;
  }
  if (hofIds.length > 1) throw scheduleError('BAD_REQUEST', 'hofChoiceRequired');
  return hofIds[0] ?? null;
};

/** The Höfe a user may count a shift for, with their names, for the enrol sheet. */
export const listEnrolmentHoefe = async (
  prisma: UserReader,
  userId: string,
): Promise<EnrolmentHof[]> => {
  const hofIds = await hofIdsOf(prisma, userId);
  if (hofIds.length === 0) return [];
  const payload = await getPayload({ config });
  const { docs } = await payload.find({
    collection: 'hoefe',
    where: { id: { in: hofIds } },
    depth: 0,
    pagination: false,
    select: { name: true },
  });
  return docs.map((hof) => ({ id: String(hof.id), name: String(hof.name) }));
};
