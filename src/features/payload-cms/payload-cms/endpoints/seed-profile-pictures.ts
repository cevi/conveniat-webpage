import { environmentVariables } from '@/config/environment-variables';
import { hasAdminOrWebAccess } from '@/features/payload-cms/payload-cms/access-rules/roles';
import { seedProfilePicturesOfFunktionen } from '@/features/payload-cms/payload-cms/utils/seed-profile-pictures';
import { getHitobito } from '@/lib/hitobito';
import type { PayloadHandler } from 'payload';

/**
 * POST /api/funktionen/seed-profile-pictures – gives the leaders behind the camp functions
 * their Cevi.DB profile picture, once, and only those without a picture of their own.
 */
export const seedProfilePicturesHandler: PayloadHandler = async (request) => {
  if (!hasAdminOrWebAccess({ req: request })) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { logger } = request.payload;
  const startedAt = Date.now();
  try {
    const hitobito = await getHitobito(request.payload);
    const result = await seedProfilePicturesOfFunktionen(
      request.payload,
      {
        listPeopleWithRole: (groupId, roleClass) =>
          hitobito.groups.listPeopleWithRole(groupId, roleClass),
      },
      new URL(environmentVariables.HITOBITO_BASE_URL).origin,
    );
    logger.info(
      {
        'user.id': request.user?.id,
        'profile_pictures.holders': result.holders,
        'profile_pictures.seeded': result.seeded,
        'profile_pictures.kept': result.kept,
        'profile_pictures.without_picture': result.withoutPicture,
        'profile_pictures.without_user': result.withoutUser,
        'profile_pictures.failed': result.failed,
        'duration.ms': Date.now() - startedAt,
      },
      'Seeded the profile pictures of the function holders from Cevi.DB',
    );
    return Response.json(result);
  } catch (error: unknown) {
    logger.error(
      { err: error, 'duration.ms': Date.now() - startedAt },
      'Seeding the profile pictures from Cevi.DB failed; no picture was changed',
    );
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 502 },
    );
  }
};
