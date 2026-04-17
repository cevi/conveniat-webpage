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

    // Phase 1: Try to find an existing user by cevi_db_uuid
    const matchedByUuid = await payload.find({
      collection: 'users',
      where: { cevi_db_uuid: { equals: ceviDatabaseUuid } },
    });

    if (matchedByUuid.totalDocs > 1) {
      const matchedIds = matchedByUuid.docs.map((userDocument) => userDocument.id).join(', ');
      throw new Error(
        `Multiple users found with the same UUID (cevi_db_uuid: ${ceviDatabaseUuid}). Matched Payload IDs: ${matchedIds}`,
      );
    }

    if (matchedByUuid.totalDocs === 1 && matchedByUuid.docs[0]?.id !== undefined) {
      return await payload.update({
        collection: 'users',
        id: matchedByUuid.docs[0].id,
        data: userData,
      });
    }

    // Phase 2: No UUID match — try to find by email (for manually created / CSV-imported users)
    const matchedByEmail = await payload.find({
      collection: 'users',
      where: { email: { equals: profile.email } },
    });

    if (matchedByEmail.totalDocs > 1) {
      const matchedIds = matchedByEmail.docs.map((userDocument) => userDocument.id).join(', ');
      throw new Error(
        `Multiple users found with the same email (${profile.email}). Matched Payload IDs: ${matchedIds}`,
      );
    }

    if (matchedByEmail.totalDocs === 1 && matchedByEmail.docs[0]?.id !== undefined) {
      const matchedUser = matchedByEmail.docs[0];
      if (
        matchedUser.cevi_db_uuid !== null &&
        matchedUser.cevi_db_uuid !== undefined &&
        matchedUser.cevi_db_uuid !== ceviDatabaseUuid
      ) {
        throw new Error(
          `Email match conflict for ${profile.email}: existing user ${matchedUser.id} is already linked to cevi_db_uuid ${matchedUser.cevi_db_uuid}, cannot relink to ${ceviDatabaseUuid}.`,
        );
      }
      // Link the existing user by setting their cevi_db_uuid
      return await payload.update({
        collection: 'users',
        id: matchedUser.id,
        data: userData,
      });
    }

    // Phase 3: No match at all — create a new user
    return await payload.create({
      collection: 'users',
      data: userData,
    });
  });
}
