import prisma from '@/lib/db/prisma';
import type { Locale } from '@/types/types';
import type { Payload, PayloadRequest } from 'payload';

/** A camp function as the rest of the camp sees it. */
export interface FunktionLabel {
  label: string;
  order: number;
}

/** A relationship reads as ids or as populated documents, depending on the depth. */
export const toFunktionIds = (value: unknown): string[] => {
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

/** The functions a Cevi.DB person holds, as synced into the `funktionen` collection. */
export const findFunktionIdsOfPerson = async (
  payload: Payload,
  ceviId: number,
  request?: PayloadRequest,
): Promise<string[]> => {
  const { docs } = await payload.find({
    collection: 'funktionen',
    where: { personIds: { in: [String(ceviId)] } },
    depth: 0,
    pagination: false,
    select: {},
    ...(request === undefined ? {} : { req: request }),
  });
  return docs.map((funktion) => funktion.id);
};

const sameIds = (a: string[], b: string[]): boolean =>
  a.length === b.length && a.every((id) => b.includes(id));

/**
 * Brings the functions stored on users in line with the synced `funktionen`, and writes only
 * the users whose functions changed. Goes through every user; there are a few thousand and a
 * handful of functions.
 *
 * @returns how many users were written
 */
export const refreshUserFunktionen = async (
  payload: Payload,
  request?: PayloadRequest,
): Promise<number> => {
  const withRequest = request === undefined ? {} : { req: request };
  const [funktionen, users] = await Promise.all([
    payload.find({
      collection: 'funktionen',
      depth: 0,
      pagination: false,
      select: { personIds: true },
      ...withRequest,
    }),
    payload.find({
      collection: 'users',
      where: {
        or: [{ cevi_db_uuid: { exists: true } }, { funktionen: { exists: true } }],
      },
      depth: 0,
      pagination: false,
      select: { cevi_db_uuid: true, funktionen: true },
      ...withRequest,
    }),
  ]);

  const funktionIdsByPerson = new Map<string, string[]>();
  for (const funktion of funktionen.docs) {
    for (const personId of funktion.personIds ?? []) {
      funktionIdsByPerson.set(personId, [
        ...(funktionIdsByPerson.get(personId) ?? []),
        funktion.id,
      ]);
    }
  }

  // see refreshUserHoefe: the Postgres copy the chat reads is compared and repaired as well
  const mirrorRows = await prisma.user.findMany({
    where: { uuid: { in: users.docs.map((user) => user.id) } },
    select: { uuid: true, funktionIds: true },
  });
  const mirrored = new Map(mirrorRows.map((row) => [row.uuid, row.funktionIds]));

  let written = 0;
  for (const user of users.docs) {
    const next =
      typeof user.cevi_db_uuid === 'number'
        ? (funktionIdsByPerson.get(String(user.cevi_db_uuid)) ?? [])
        : [];
    const inPostgres = mirrored.get(user.id);
    if (!sameIds(next, toFunktionIds(user.funktionen))) {
      // without the request: a derived field, not an edit by whoever triggered the refresh
      await payload.update({ collection: 'users', id: user.id, data: { funktionen: next } });
      written += 1;
    } else if (inPostgres !== undefined && !sameIds(next, inPostgres)) {
      await prisma.user.update({ where: { uuid: user.id }, data: { funktionIds: next } });
      written += 1;
    }
  }
  return written;
};

/**
 * Every function by id, labelled in the given locale. The label falls back to German, the
 * language the sync suggests it in, and then to the name of the Cevi.DB group.
 */
export const getFunktionDirectory = async (
  payload: Payload,
  locale: Locale,
): Promise<Map<string, FunktionLabel>> => {
  const { docs } = await payload.find({
    collection: 'funktionen',
    depth: 0,
    pagination: false,
    locale: 'all',
    overrideAccess: true,
    select: { label: true, groupName: true, order: true },
  });
  return new Map(
    docs.map((funktion) => {
      // with `locale: 'all'` a localized field comes back as an object by locale
      const labels = funktion.label as unknown as Partial<Record<Locale, string | null>> | null;
      // an emptied label counts as missing, so it falls back like one that was never set
      const label =
        [labels?.[locale], labels?.de, funktion.groupName].find(
          (candidate) => typeof candidate === 'string' && candidate.trim() !== '',
        ) ?? '';
      return [
        funktion.id,
        {
          label,
          order: funktion.order ?? 0,
        },
      ];
    }),
  );
};

/** The labels of a user's functions, in the order the camp gave them. */
export const describeFunktionen = (
  funktionIds: string[],
  directory: Map<string, FunktionLabel>,
): string[] =>
  funktionIds
    .map((id) => directory.get(id))
    .filter((funktion): funktion is FunktionLabel => funktion !== undefined)
    .toSorted((a, b) => a.order - b.order)
    .map((funktion) => funktion.label)
    .filter((label) => label !== '');
