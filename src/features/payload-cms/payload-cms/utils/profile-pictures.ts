import { S3_BUCKET_NAME, s3Client } from '@/lib/s3';
import {
  LARGE_PROFILE_PICTURE_EDGE,
  PROFILE_PICTURE_UPLOAD_CONTEXT,
  profilePictureKey,
} from '@/utils/profile-picture-url';
import { createLogger } from '@/utils/server-logger';
import { DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { createHash } from 'node:crypto';
import type { BasePayload } from 'payload';
import sharp from 'sharp';

const logger = createLogger('profile-pictures');

/** Edge length of the avatar square, enough for a 64px avatar on a 3x screen. */
const PICTURE_SIZE = 192;

/** A profile picture as it is stored: the avatar every list loads, and the full-screen one. */
export interface ProfilePictureImages {
  avatar: Buffer;
  large: Buffer;
}

/**
 * Crops a photo to the two square webps of a profile picture: the small avatar, and the large
 * one a tap opens full screen, at most {@link LARGE_PROFILE_PICTURE_EDGE} and never enlarged.
 * Throws for anything sharp cannot read as a raster image.
 */
export const toProfilePicture = async (photo: Buffer): Promise<ProfilePictureImages> => {
  // ESLint cannot resolve sharp's types (its `.d.mts`), tsc can; see `upload-router.ts`
  /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */
  const image = sharp(photo, { limitInputPixels: 8000 * 8000 });
  const { format, width, height } = await image.metadata();
  if (format === 'svg') throw new Error('An SVG is no photo');
  // a smaller photo stays its own size; the rotation does not change its short edge
  const largeEdge = Math.min(LARGE_PROFILE_PICTURE_EDGE, width ?? 0, height ?? 0) || PICTURE_SIZE;
  const square = (edge: number): Promise<Buffer> =>
    image
      .clone()
      .rotate()
      .resize(edge, edge, { fit: 'cover', position: 'attention' })
      .webp({ quality: 80 })
      .toBuffer();
  const [avatar, large] = await Promise.all([square(PICTURE_SIZE), square(largeEdge)]);
  return { avatar, large };
  /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */
};

/**
 * Makes a picture the user's, or with `undefined` removes theirs. The version goes to the user,
 * which mirrors it to Postgres, where the picture route reads it; the previous picture is
 * deleted after that, so no reader ever points at a missing one.
 */
export const setProfilePicture = async (
  payload: BasePayload,
  userId: string,
  picture: ProfilePictureImages | undefined,
  previousVersion: string | undefined,
): Promise<string | undefined> => {
  let version: string | undefined;
  if (picture !== undefined) {
    const stored = createHash('sha256').update(picture.avatar).digest('hex').slice(0, 16);
    version = stored;
    // both sizes are in place before the user points at the version
    await Promise.all(
      (['avatar', 'large'] as const).map((size) =>
        s3Client.send(
          new PutObjectCommand({
            Bucket: S3_BUCKET_NAME,
            Key: profilePictureKey(userId, stored, size),
            Body: picture[size],
            ContentType: 'image/webp',
          }),
        ),
      ),
    );
  }

  await payload.update({
    collection: 'users',
    id: userId,
    data: { profilePictureVersion: version ?? null },
    overrideAccess: true,
    context: { [PROFILE_PICTURE_UPLOAD_CONTEXT]: true },
  });

  if (previousVersion !== undefined && previousVersion !== version) {
    // a picture from before the large size has none; deleting a missing key succeeds
    await Promise.all(
      (['avatar', 'large'] as const).map((size) =>
        s3Client
          .send(
            new DeleteObjectCommand({
              Bucket: S3_BUCKET_NAME,
              Key: profilePictureKey(userId, previousVersion, size),
            }),
          )
          .catch((error: unknown) => {
            // an orphan in the bucket costs a few kilobytes; nobody can reach it any more
            logger.warn('Could not delete the previous profile picture', {
              error,
              'user.id': userId,
            });
          }),
      ),
    );
  }
  return version;
};
