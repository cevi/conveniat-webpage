import { getAdministeredGroupIds } from '@/features/payload-cms/payload-cms/access-rules/can-access-hof-dashboard';
import { HOF_ADMINISTRATOR_ROLE_CLASS } from '@/features/payload-cms/payload-cms/access-rules/hof-administrator-role';
import type { Wristband } from '@/features/payload-cms/payload-types';
import type { Payload } from 'payload';

/*
Who a tapped band leads to, for the page the band opens and for the chat it starts. Both the
wristbands and the chat need it and neither may import the other, so it reads the collections
here: `wristbands`, `bill-participants`, `users` and `hoefe`.
*/

/** The registration a band was handed to, as far as the band's page needs it. */
export interface BandRegistration {
  fullName: string;
  firstName: string | null;
  nickname: string | null;
  /** the Cevi.DB person, `bill-participants.userId` */
  ceviPersonId: string;
}

/** A band and whom it was handed to. */
export type BandWearer =
  | { band: 'unknown' | 'revoked'; hofId: null; registration: null }
  | { band: 'unassigned'; hofId: string; registration: null }
  | { band: 'worn'; hofId: string; registration: BandRegistration };

const idOf = (value: string | { id: string } | null | undefined): string | undefined =>
  typeof value === 'string' ? value : value?.id;

const textOrNull = (value: string | null | undefined): string | null =>
  value === undefined || value === null || value.trim() === '' ? null : value;

/** What of a band's registration `toBandWearer` reads, for a `populate` of `bill-participants`. */
export const BAND_REGISTRATION_FIELDS = {
  fullName: true,
  firstName: true,
  nickname: true,
  userId: true,
} as const;

/**
 * Whom a band was handed to, from the band as found with its registration filled in, see
 * `BAND_REGISTRATION_FIELDS`; undefined for a band nobody knows. A blocked band names nobody.
 */
export const toBandWearer = (
  band: Pick<Wristband, 'status' | 'participant' | 'hof'> | undefined,
): BandWearer => {
  if (band === undefined) return { band: 'unknown', hofId: null, registration: null };
  if (band.status === 'revoked') return { band: 'revoked', hofId: null, registration: null };

  const hofId = idOf(band.hof) ?? '';
  const registration = band.participant;
  if (typeof registration !== 'object' || registration === null) {
    return { band: 'unassigned', hofId, registration: null };
  }
  return {
    band: 'worn',
    hofId,
    registration: {
      fullName: registration.fullName,
      firstName: textOrNull(registration.firstName),
      nickname: textOrNull(registration.nickname),
      ceviPersonId: registration.userId,
    },
  };
};

/** Whose a band is, by its UID; a blocked band names nobody. */
export const findBandWearer = async (
  payload: Pick<Payload, 'find'>,
  uid: string,
): Promise<BandWearer> => {
  const { docs } = await payload.find({
    collection: 'wristbands',
    where: { uid: { equals: uid } },
    depth: 1,
    limit: 1,
    overrideAccess: true,
    select: { status: true, participant: true, hof: true },
    populate: { 'bill-participants': BAND_REGISTRATION_FIELDS },
  });
  return toBandWearer(docs[0]);
};

/**
 * What everybody who taps a band reads about its wearer: the Ceviname, or without one the
 * first name. Never the last name.
 */
export const shortNameOf = (registration: BandRegistration): string | null =>
  registration.nickname ?? registration.firstName;

/**
 * The app user of a Cevi.DB person, or undefined if the person never logged into the app:
 * the login creates the Payload user and stores the person's id on it.
 */
export const findAppUserOfPerson = async (
  payload: Pick<Payload, 'find'>,
  ceviPersonId: string,
): Promise<string | undefined> => {
  const personId = Number(ceviPersonId);
  if (!Number.isInteger(personId) || personId <= 0) return undefined;
  const { docs } = await payload.find({
    collection: 'users',
    where: { cevi_db_uuid: { equals: personId } },
    depth: 0,
    limit: 1,
    overrideAccess: true,
    select: { cevi_db_uuid: true },
  });
  return docs[0]?.id;
};

/** An app user who leads a Hof, as the safety team reaches them. */
export interface HofAdministrator {
  userId: string;
  fullName: string;
  nickname: string | null;
}

/**
 * The app users who are AVP of a Hof by the rule that gives it its wristbands and its Hof
 * dashboard: address administrators of the Hof's Cevi.DB group, read off the groups the login
 * stores on the user.
 *
 * The query narrows to users in the group who administer addresses somewhere, which is few
 * even for a Hof with hundreds of members, and reads all of them: a limit before the exact
 * match below dropped an AVP whose name sorted after the group's first members. It cannot ask
 * for both in the same entry, so the role in this very group is matched after.
 */
export const findHofAdministrators = async (
  payload: Pick<Payload, 'find' | 'findByID'>,
  hofId: string,
): Promise<HofAdministrator[]> => {
  const hof = await payload.findByID({
    collection: 'hoefe',
    id: hofId,
    depth: 0,
    overrideAccess: true,
    disableErrors: true,
    select: { groupId: true },
  });
  const groupId = hof?.groupId;
  const byGroup =
    groupId === undefined || groupId === ''
      ? []
      : [
          {
            and: [
              { 'groups.id': { equals: Number(groupId) } },
              { 'groups.role_class': { equals: HOF_ADMINISTRATOR_ROLE_CLASS } },
            ],
          },
        ];

  const { docs } = await payload.find({
    collection: 'users',
    // the address administrator of the Hof's group, or the Hauptleitung of its camp
    where: { or: [...byGroup, { avpHoefe: { contains: hofId } }] },
    depth: 0,
    pagination: false,
    overrideAccess: true,
    sort: 'fullName',
    select: { fullName: true, nickname: true, groups: true, avpHoefe: true },
  });
  return docs
    .filter(
      (user) =>
        (groupId !== undefined && getAdministeredGroupIds(user.groups).includes(groupId)) ||
        (user.avpHoefe ?? []).some(
          (avpHof) => (typeof avpHof === 'string' ? avpHof : avpHof.id) === hofId,
        ),
    )
    .map((user) => ({
      userId: user.id,
      fullName: user.fullName,
      nickname: textOrNull(user.nickname),
    }));
};
