import { trpcBaseProcedure } from '@/trpc/init';
import { formatUserFullName } from '@/utils/format-user-name';
import { z } from 'zod';

export interface Contact {
  userId: string;
  name: string;
  nickname?: string | null | undefined;
  description?: string | null | undefined;
}

/**
 * Lists all the contacts of the current user.
 *
 * Formats contact names as "Vorname Nachname v/o Ceviname" if nickname is present,
 * or "Vorname Nachname" if nickname is not set.
 */
export const listContacts = trpcBaseProcedure
  .input(z.object({})) // no input needed for this query
  .query(async ({ ctx }) => {
    const { user, prisma } = ctx;

    const _contacts = await prisma.user.findMany({
      where: {
        uuid: { not: user.uuid },
        hidden: false,
      },
      select: {
        uuid: true,
        name: true,
        description: true,
      },
    });

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

      for (const u of cmsUsers.docs) {
        cmsUsersMap.set(u.id, {
          fullName: u.fullName,
          nickname: u.nickname,
        });
      }
    } catch {
      // Fall back to prisma user names if payload query fails
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
      };
    });
  });
