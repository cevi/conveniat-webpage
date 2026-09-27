import {
  findMyHofIds,
  getRegisteredEventIds,
  type HofMembershipKeys,
} from '@/features/payload-cms/payload-cms/utils/hof-membership';
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
 * The camp events the user is registered for. The session's uuid is the Payload user; the
 * registrations know the Cevi.DB person.
 */
const getMyRegisteredEventIds = async (userUuid: string): Promise<string[]> => {
  const payload = await getPayload({ config });
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
  return await getRegisteredEventIds(payload, ceviId);
};

/**
 * The Höfe the user belongs to: the ones they lead through the Hof's Cevi.DB group, and the
 * ones whose camp they are registered for. Read once per request.
 */
export const getMyHofIds = cache(async (user: HitobitoNextAuthUser): Promise<string[]> => {
  const [hoefe, eventIds] = await Promise.all([listHoefe(), getMyRegisteredEventIds(user.uuid)]);
  const mine = findMyHofIds(hoefe, user.group_ids, eventIds);
  logger.debug('Resolved the Höfe of a material depot user', {
    'material.hoefe.registrations': eventIds.length,
    'material.hoefe.mine': mine.length,
  });
  return mine;
});

/** A loan's Hof by name. */
export interface LoanHof {
  id: string;
  name: string;
}

/**
 * Adds the Hof's name to loans. The Hof is a Payload document, so Prisma cannot join it. A
 * loan booked on a person without a Hof, or whose Hof is gone, gets `null`; `hofId` tells the
 * two apart.
 */
export const withHof = async <T extends { hofId: string | null }>(
  loans: T[],
): Promise<(T & { hof: LoanHof | null })[]> => {
  const hoefe = await listHoefe();
  const names = new Map(hoefe.map((hof) => [hof.id, hof.name]));
  return loans.map((loan) => {
    const name = loan.hofId === null ? undefined : names.get(loan.hofId);
    return {
      ...loan,
      // eslint-disable-next-line unicorn/no-null -- the same shape for every loan
      hof: loan.hofId === null || name === undefined ? null : { id: loan.hofId, name },
    };
  });
};

/** The Hof lives in Payload, so no foreign key checks that it exists. */
export const hofExists = async (hofId: string): Promise<boolean> => {
  const hoefe = await listHoefe();
  return hoefe.some((hof) => hof.id === hofId);
};
