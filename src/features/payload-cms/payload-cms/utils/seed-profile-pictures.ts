import {
  setProfilePicture,
  toAvatar,
} from '@/features/payload-cms/payload-cms/utils/profile-pictures';
import {
  LEITUNG_ROLE_CLASS,
  type FunktionenSource,
} from '@/features/payload-cms/payload-cms/utils/sync-funktionen';
import { createLogger } from '@/utils/server-logger';
import type { BasePayload } from 'payload';

const logger = createLogger('profile-pictures:seed');

/** Cevi.DB accepts pictures of up to 8000 by 8000 pixels; no avatar needs more than this. */
const MAX_DOWNLOAD_BYTES = 10 * 1024 * 1024;
/** Only an uploaded picture lives here; a person without one gets Cevi.DB's placeholder. */
const ACTIVE_STORAGE_PATH = '/rails/active_storage/blobs/';

/** What a seed did, for the editor who started it. */
export interface ProfilePictureSeedResult {
  /** people who lead a group of a camp function */
  holders: number;
  /** of them, got their Cevi.DB picture now */
  seeded: number;
  /** already had a picture of their own, which was kept */
  kept: number;
  /** have no picture in Cevi.DB */
  withoutPicture: number;
  /** never logged in to the app, so there is nobody to give the picture to yet */
  withoutUser: number;
  failed: number;
}

/**
 * The picture URL of a person, if they uploaded one to Cevi.DB and it is on the Cevi.DB origin.
 * Anything else is never fetched.
 */
export const uploadedPictureUrl = (picture: string, cevidbOrigin: string): URL | undefined => {
  if (picture === '') return undefined;
  let url: URL;
  try {
    url = new URL(picture, cevidbOrigin);
  } catch {
    return undefined;
  }
  return url.origin === cevidbOrigin && url.pathname.startsWith(ACTIVE_STORAGE_PATH)
    ? url
    : undefined;
};

/** Cevi.DB answers with a redirect to its object storage, so redirects are followed. */
const downloadPicture = async (url: URL): Promise<Buffer> => {
  const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!response.ok)
    throw new Error(`Downloading the picture failed with ${String(response.status)}`);
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.startsWith('image/')) throw new Error(`The picture is ${contentType}`);
  const photo = Buffer.from(await response.arrayBuffer());
  if (photo.byteLength > MAX_DOWNLOAD_BYTES) throw new Error('The picture is too large');
  return photo;
};

/**
 * Gives the leaders behind the camp functions, e.g. the Ressortleitungen, their Cevi.DB profile
 * picture as a start, read with the service account. Meant to run once: it never touches a
 * user who has a picture, so one they uploaded themselves stays, and running it again only
 * reaches those still without one.
 */
export const seedProfilePicturesOfFunktionen = async (
  payload: BasePayload,
  source: Pick<FunktionenSource, 'listPeopleWithRole'>,
  cevidbOrigin: string,
): Promise<ProfilePictureSeedResult> => {
  const { docs: funktionen } = await payload.find({
    collection: 'funktionen',
    pagination: false,
    depth: 0,
    overrideAccess: true,
    select: { groupId: true },
  });

  // read everything first, so a Cevi.DB failure leaves no half-seeded state to reason about
  const pictureByPerson = new Map<string, string>();
  for (const groupId of new Set(funktionen.map((funktion) => funktion.groupId))) {
    for (const holder of await source.listPeopleWithRole(groupId, LEITUNG_ROLE_CLASS)) {
      if (holder.personId !== '') pictureByPerson.set(holder.personId, holder.picture);
    }
  }

  const { docs: users } = await payload.find({
    collection: 'users',
    pagination: false,
    depth: 0,
    overrideAccess: true,
    where: { cevi_db_uuid: { in: [...pictureByPerson.keys()].map(Number) } },
    select: { cevi_db_uuid: true, profilePictureVersion: true },
  });

  const result: ProfilePictureSeedResult = {
    holders: pictureByPerson.size,
    seeded: 0,
    kept: 0,
    withoutPicture: 0,
    withoutUser: pictureByPerson.size - users.length,
    failed: 0,
  };

  for (const user of users) {
    if (typeof user.profilePictureVersion === 'string' && user.profilePictureVersion !== '') {
      result.kept += 1;
      continue;
    }
    const url = uploadedPictureUrl(
      pictureByPerson.get(String(user.cevi_db_uuid)) ?? '',
      cevidbOrigin,
    );
    if (url === undefined) {
      result.withoutPicture += 1;
      continue;
    }
    try {
      const avatar = await toAvatar(await downloadPicture(url));
      await setProfilePicture(payload, user.id, avatar, undefined);
      result.seeded += 1;
    } catch (error: unknown) {
      result.failed += 1;
      logger.warn('Could not seed a profile picture from Cevi.DB', { error, 'user.id': user.id });
    }
  }
  return result;
};
