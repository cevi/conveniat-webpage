import prisma from '@/lib/db/prisma';
import type { Payload, PayloadRequest, Where } from 'payload';

/** What decides whether somebody belongs to a Hof: its Cevi.DB group and its camp events. */
export interface HofMembershipKeys {
  id: string;
  groupId: string;
  eventIds: string[];
}

/** Cevi.DB ids arrive as numbers from the session and as text from Payload. */
const toCeviId = (value: string | number): number | undefined => {
  const id = typeof value === 'number' ? value : Number(value.trim());
  return Number.isInteger(id) && id > 0 ? id : undefined;
};

const toIdSet = (values: (string | number)[]): Set<number> =>
  new Set(values.map((value) => toCeviId(value)).filter((id) => id !== undefined));

/**
 * The Höfe a person belongs to: the ones they lead, through membership in the Hof's Cevi.DB
 * group, and the ones whose camp they are registered for.
 */
export const findMyHofIds = (
  hoefe: HofMembershipKeys[],
  groupIds: number[],
  registeredEventIds: string[],
): string[] => {
  const groups = toIdSet(groupIds);
  const events = toIdSet(registeredEventIds);
  return hoefe
    .filter((hof) => {
      const groupId = toCeviId(hof.groupId);
      if (groupId !== undefined && groups.has(groupId)) return true;
      return hof.eventIds.some((eventId) => {
        const id = toCeviId(eventId);
        return id !== undefined && events.has(id);
      });
    })
    .map((hof) => hof.id);
};

/**
 * A registration counts while it is active and not removed. The same rule decides who gets a
 * bill, so the address book and the billing agree on who is at a Hof's camp.
 */
const ACTIVE_REGISTRATION: Where = {
  and: [{ active: { not_equals: false } }, { status: { not_equals: 'removed' } }],
};

/** Most registrations one person has; one per camp event they take part in. */
const MAX_REGISTRATIONS = 100;

/** Every Hof with what decides who belongs to it. */
const listHofMembershipKeys = async (
  payload: Payload,
  request?: PayloadRequest,
): Promise<HofMembershipKeys[]> => {
  const { docs } = await payload.find({
    collection: 'hoefe',
    depth: 0,
    pagination: false,
    select: { groupId: true, events: true },
    ...(request === undefined ? {} : { req: request }),
  });
  return docs.map((hof) => ({
    id: hof.id,
    groupId: hof.groupId,
    eventIds: (hof.events ?? []).map((event) => event.eventId),
  }));
};

/**
 * The camp events one person is registered for, from the billing's copy of the Cevi.DB
 * participations.
 */
export const getRegisteredEventIds = async (
  payload: Payload,
  ceviId: number,
  request?: PayloadRequest,
): Promise<string[]> => {
  const { docs } = await payload.find({
    collection: 'bill-participants',
    where: { and: [{ userId: { equals: String(ceviId) } }, ACTIVE_REGISTRATION] },
    depth: 0,
    limit: MAX_REGISTRATIONS,
    pagination: false,
    select: { eventId: true },
    ...(request === undefined ? {} : { req: request }),
  });
  return docs.map((registration) => registration.eventId);
};

/**
 * The Höfe a person is registered at. Only registrations count, not leading a Hof's group:
 * this is what the rest of the camp gets to see about somebody.
 */
export const findRegisteredHofIds = async (
  payload: Payload,
  ceviId: number,
  request?: PayloadRequest,
): Promise<string[]> => {
  const [hoefe, eventIds] = await Promise.all([
    listHofMembershipKeys(payload, request),
    getRegisteredEventIds(payload, ceviId, request),
  ]);
  return findMyHofIds(hoefe, [], eventIds);
};

/** A relationship reads as ids or as populated documents, depending on the depth. */
export const toHofIds = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry: unknown) => {
      if (typeof entry === 'string') return entry;
      if (typeof entry === 'object' && entry !== null && 'id' in entry) {
        return typeof entry.id === 'string' ? entry.id : '';
      }
      return '';
    })
    .filter((id) => id !== '');
};

const sameIds = (a: string[], b: string[]): boolean =>
  a.length === b.length && a.every((id) => b.includes(id));

/**
 * Brings the Höfe stored on users in line with their registrations, and writes only the users
 * whose Höfe changed. Without `ceviIds` it goes through every user, which is how the stored
 * Höfe are filled the first time and how drift is repaired.
 *
 * @returns how many users were written
 */
export const refreshUserHoefe = async (
  payload: Payload,
  { ceviIds, req: request }: { ceviIds?: number[]; req?: PayloadRequest } = {},
): Promise<number> => {
  if (ceviIds?.length === 0) return 0;
  const withRequest = request === undefined ? {} : { req: request };

  const [hoefe, users, registrations] = await Promise.all([
    listHofMembershipKeys(payload, request),
    payload.find({
      collection: 'users',
      where:
        ceviIds === undefined
          ? { cevi_db_uuid: { exists: true } }
          : { cevi_db_uuid: { in: ceviIds } },
      depth: 0,
      pagination: false,
      select: { cevi_db_uuid: true, hoefe: true },
      ...withRequest,
    }),
    payload.find({
      collection: 'bill-participants',
      where:
        ceviIds === undefined
          ? ACTIVE_REGISTRATION
          : { and: [{ userId: { in: ceviIds.map(String) } }, ACTIVE_REGISTRATION] },
      depth: 0,
      pagination: false,
      select: { userId: true, eventId: true },
      ...withRequest,
    }),
  ]);

  const eventIdsByPerson = new Map<string, string[]>();
  for (const { userId, eventId } of registrations.docs) {
    eventIdsByPerson.set(userId, [...(eventIdsByPerson.get(userId) ?? []), eventId]);
  }

  // The chat reads the Postgres copy, which `syncUserToPostgres` fills on every user write but
  // gives up on silently, e.g. before the migration of the column ran. Compared as well, so a
  // run repairs it instead of trusting a Mongo value that already matches.
  const mirrorRows = await prisma.user.findMany({
    where: { uuid: { in: users.docs.map((user) => user.id) } },
    select: { uuid: true, hofIds: true },
  });
  const mirrored = new Map(mirrorRows.map((row) => [row.uuid, row.hofIds]));

  let written = 0;
  for (const user of users.docs) {
    if (typeof user.cevi_db_uuid !== 'number') continue;
    const next = findMyHofIds(hoefe, [], eventIdsByPerson.get(String(user.cevi_db_uuid)) ?? []);
    const inPostgres = mirrored.get(user.id);
    if (!sameIds(next, toHofIds(user.hoefe))) {
      // without the request: a derived field, not an edit by whoever triggered the refresh
      await payload.update({ collection: 'users', id: user.id, data: { hoefe: next } });
      written += 1;
    } else if (inPostgres !== undefined && !sameIds(next, inPostgres)) {
      await prisma.user.update({ where: { uuid: user.id }, data: { hofIds: next } });
      written += 1;
    }
  }
  return written;
};
