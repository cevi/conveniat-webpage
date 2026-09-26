import { findMyHofIds, type HofMembershipKeys } from '@/features/material/utils/hoefe';
import type { HitobitoNextAuthUser } from '@/types/hitobito-next-auth-user';
import { createLogger } from '@/utils/server-logger';
import config from '@payload-config';
import { getPayload } from 'payload';
import { cache } from 'react';

const logger = createLogger('material:hoefe');

/** A Hof as the depot uses it; the billing's address fields stay out. */
export interface MaterialHof extends HofMembershipKeys {
  name: string;
}

/** Most registrations one person has; one per camp event they take part in. */
const MAX_REGISTRATIONS = 100;

/**
 * Every Hof, sorted by name. The Höfe live in Payload and are kept by the Cevi.DB sync of the
 * billing, so the depot only reads them. Read once per request.
 */
export const listHoefe = cache(async (): Promise<MaterialHof[]> => {
  const payload = await getPayload({ config });
  const { docs } = await payload.find({
    collection: 'hoefe',
    depth: 0,
    limit: 1000,
    overrideAccess: true,
    pagination: false,
    select: { name: true, groupId: true, events: true },
  });
  return docs
    .map((hof) => ({
      id: hof.id,
      name: hof.name,
      groupId: hof.groupId,
      eventIds: (hof.events ?? []).map((event) => event.eventId),
    }))
    .toSorted((a, b) => a.name.localeCompare(b.name, 'de'));
});

/**
 * The camp events the user is registered for, from the billing's copy of the Cevi.DB
 * participations. A registration that was removed or is not active does not count.
 */
const getRegisteredEventIds = async (userUuid: string): Promise<string[]> => {
  const payload = await getPayload({ config });
  // the session's uuid is the Payload user; the registrations know the Cevi.DB person
  const user = await payload.findByID({
    collection: 'users',
    id: userUuid,
    depth: 0,
    overrideAccess: true,
    disableErrors: true,
    select: { cevi_db_uuid: true },
  });
  const ceviId = user?.cevi_db_uuid;
  if (typeof ceviId !== 'number') return [];

  const { docs } = await payload.find({
    collection: 'bill-participants',
    where: {
      and: [
        { userId: { equals: String(ceviId) } },
        { active: { not_equals: false } },
        { status: { not_equals: 'removed' } },
      ],
    },
    depth: 0,
    limit: MAX_REGISTRATIONS,
    overrideAccess: true,
    pagination: false,
    select: { eventId: true },
  });
  return docs.map((registration) => registration.eventId);
};

/**
 * The Höfe the user belongs to: the ones they lead through the Hof's Cevi.DB group, and the
 * ones whose camp they are registered for. Read once per request.
 */
export const getMyHofIds = cache(async (user: HitobitoNextAuthUser): Promise<string[]> => {
  const [hoefe, eventIds] = await Promise.all([listHoefe(), getRegisteredEventIds(user.uuid)]);
  const mine = findMyHofIds(hoefe, user.group_ids, eventIds);
  logger.debug('Resolved the Höfe of a material depot user', {
    'material.hoefe.registrations': eventIds.length,
    'material.hoefe.mine': mine.length,
  });
  return mine;
});

/** A loan's Hof by name, `null` when the Hof has been deleted since. */
export interface LoanHof {
  id: string;
  name: string;
}

/**
 * Adds the Hof's name to loans. The Hof is a Payload document, so Prisma cannot join it; a
 * loan whose Hof is gone gets `null` and shows as an unknown Hof.
 */
export const withHof = async <T extends { hofId: string }>(
  loans: T[],
): Promise<(T & { hof: LoanHof | null })[]> => {
  const hoefe = await listHoefe();
  const names = new Map(hoefe.map((hof) => [hof.id, hof.name]));
  return loans.map((loan) => {
    const name = names.get(loan.hofId);
    // eslint-disable-next-line unicorn/no-null -- the same shape for every loan
    return { ...loan, hof: name === undefined ? null : { id: loan.hofId, name } };
  });
};
