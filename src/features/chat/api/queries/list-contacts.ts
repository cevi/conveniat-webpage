import {
  describeFunktionen,
  getFunktionDirectory,
  type FunktionLabel,
} from '@/features/payload-cms/payload-cms/utils/funktionen';
import {
  describeHoefe,
  describeHofRoles,
  getHofDirectory,
  type HofLabel,
  type HofRole,
} from '@/features/payload-cms/payload-cms/utils/hof-directory';
import { getFeatureFlag } from '@/lib/db/redis';
import {
  FEATURE_FLAG_RESTRICT_CONTACT_LIST,
  FEATURE_HIDE_HOF_AND_QUARTIER,
} from '@/lib/feature-flags';
import { trpcBaseProcedure } from '@/trpc/init';
import { formatUserFullName } from '@/utils/format-user-name';
import { profilePictureUrlOrUndefined } from '@/utils/profile-picture-url';
import { createLogger } from '@/utils/server-logger';
import { z } from 'zod';

const logger = createLogger('chat:queries');

export interface Contact {
  userId: string;
  name: string;
  nickname?: string | null | undefined;
  description?: string | null | undefined;
  /** Names of the Höfe the contact is registered at; missing when hidden by the feature flag. */
  hoefe?: string[] | undefined;
  /** Names of the Quartiere of those Höfe, each once. */
  quartiere?: string[] | undefined;
  /** Each Hof with its Quartier and whether the contact is its AVP; newer than `hoefe`. */
  hofRoles?: HofRole[] | undefined;
  /** Functions in the camp organisation, e.g. "Ressortleitung Infrastruktur", in order. */
  funktionen?: string[] | undefined;
  /** The profile picture from Cevi.DB; missing without one, and in caches from before. */
  pictureUrl?: string | undefined;
}

/**
 * Lists the contacts of the current user.
 *
 * With the contact list restricted, that is the people sharing a Hof with the user, the
 * people in their address book (see `AddressBookEntry`), and everyone holding a function or
 * the AVP role of a Hof. Otherwise it is everyone.
 *
 * Formats contact names as "Vorname Nachname v/o Ceviname" if nickname is present,
 * or "Vorname Nachname" if nickname is not set.
 */
export const listContacts = trpcBaseProcedure
  .input(z.object({})) // no input needed for this query
  .query(async ({ ctx }) => {
    const { user, prisma } = ctx;

    const restrictContactList = await getFeatureFlag(FEATURE_FLAG_RESTRICT_CONTACT_LIST);
    const self = restrictContactList
      ? await prisma.user.findUnique({ where: { uuid: user.uuid }, select: { hofIds: true } })
      : undefined;
    const ownHofIds = self?.hofIds ?? [];

    const _contacts = await prisma.user.findMany({
      where: {
        uuid: { not: user.uuid },
        hidden: false,
        ...(restrictContactList
          ? {
              OR: [
                { hofIds: { hasSome: ownHofIds } },
                { inAddressBooksOf: { some: { ownerId: user.uuid } } },
                { funktionIds: { isEmpty: false } },
                { avpHofIds: { isEmpty: false } },
              ],
            }
          : {}),
      },
      select: {
        uuid: true,
        name: true,
        description: true,
        hofIds: true,
        avpHofIds: true,
        funktionIds: true,
        profilePictureVersion: true,
      },
    });

    const hideHofAndQuartier = await getFeatureFlag(FEATURE_HIDE_HOF_AND_QUARTIER);
    let hofDirectory = new Map<string, HofLabel>();
    let funktionDirectory = new Map<string, FunktionLabel>();

    const cmsUsersMap = new Map<
      string,
      { fullName?: string; nickname?: string | null | undefined }
    >();
    try {
      const { getPayload } = await import('payload');
      const { default: config } = await import('@payload-config');
      const payload = await getPayload({ config });

      const cmsUsers = await payload.find({
        collection: 'users',
        where: {
          hidden: { equals: false },
        },
        limit: 1000,
        depth: 0,
      });

      if (!hideHofAndQuartier) hofDirectory = await getHofDirectory(payload);
      funktionDirectory = await getFunktionDirectory(payload, ctx.locale);

      for (const u of cmsUsers.docs) {
        cmsUsersMap.set(u.id, {
          fullName: u.fullName,
          nickname: u.nickname,
        });
      }
    } catch (error) {
      // Fall back to prisma user names, and no Höfe, if payload query fails
      logger.warn('Falling back to prisma user names, the Payload user query failed', { error });
    }

    return _contacts.map((contact) => {
      const cmsUser = cmsUsersMap.get(contact.uuid);
      let name = contact.name;
      const nickname = cmsUser?.nickname ?? undefined;

      if (cmsUser?.fullName) {
        name = formatUserFullName(cmsUser.fullName, cmsUser.nickname);
      }

      return {
        userId: contact.uuid,
        name,
        nickname,
        description: contact.description,
        ...(hideHofAndQuartier
          ? {}
          : {
              ...describeHoefe(contact.hofIds, hofDirectory),
              hofRoles: describeHofRoles(contact.hofIds, contact.avpHofIds, hofDirectory),
            }),
        funktionen: describeFunktionen(contact.funktionIds, funktionDirectory),
        pictureUrl: profilePictureUrlOrUndefined(contact.uuid, contact.profilePictureVersion),
      };
    });
  });
