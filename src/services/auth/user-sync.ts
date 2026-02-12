import type { HitobitoProfile } from '@/features/next-auth/types/hitobito-profile';
import type { User as PayloadUser } from '@/features/payload-cms/payload-types';
import { withSpan } from '@/utils/tracing-helpers';
import { getPayload } from 'payload';

/**
 * Syncs a user profile from Hitobito to the Payload CMS.
 */
export async function syncUserWithCeviDB(profile: HitobitoProfile): Promise<PayloadUser> {
  return await withSpan('syncUserWithCeviDB', async () => {
    // Dynamic import to avoid circular dependency
    const { default: config } = await import('@payload-config');
    const payload = await getPayload({ config });

    // Ensure the id is a number - Hitobito may return it as a string in some cases
    const ceviDatabaseUuid =
      typeof profile.id === 'string' ? Number.parseInt(profile.id, 10) : profile.id;

    if (Number.isNaN(ceviDatabaseUuid)) {
      throw new TypeError(`Invalid user ID from Hitobito: ${profile.id}`);
    }

    const userData = {
      cevi_db_uuid: ceviDatabaseUuid,
      groups: profile.roles.map((role) => ({
        id: role.group_id,
        name: role.group_name,
        role_name: role.role_name,
        role_class: role.role_class,
      })),
      email: profile.email,
      fullName: profile.first_name + ' ' + profile.last_name,
      nickname: profile.nickname,
    };

    const matchedUsers = await payload.find({
      collection: 'users',
      where: { cevi_db_uuid: { equals: ceviDatabaseUuid } },
    });

    if (matchedUsers.totalDocs > 1) {
      const matchedIds = matchedUsers.docs.map((userDocument) => userDocument.id).join(', ');
      throw new Error(
        `Multiple users found with the same UUID (cevi_db_uuid: ${ceviDatabaseUuid}). Matched Payload IDs: ${matchedIds}`,
      );
    }

    if (matchedUsers.totalDocs === 1 && matchedUsers.docs[0]?.id !== undefined) {
      return await payload.update({
        collection: 'users',
        id: matchedUsers.docs[0].id,
        data: userData,
      });
    }

    // save the new user to the database
    return await payload.create({
      collection: 'users',
      data: userData,
    });
  });
}
