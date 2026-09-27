import { S3_BUCKET_NAME, s3Client } from '@/lib/s3';
import { PROFILE_PICTURE_UPLOAD_CONTEXT, profilePictureKey } from '@/utils/profile-picture-url';
import { createLogger } from '@/utils/server-logger';
import { DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { createHash } from 'node:crypto';
import type { BasePayload } from 'payload';
import sharp from 'sharp';

const logger = createLogger('profile-pictures');

/** Edge length of the stored square, enough for a 64px avatar on a 3x screen. */
const PICTURE_SIZE = 192;

/**
 * Crops a photo to the small square webp every avatar loads. Throws for anything sharp cannot
 * read as a raster image.
 */
export const toAvatar = async (photo: Buffer): Promise<Buffer> => {
  // ESLint cannot resolve sharp's types (its `.d.mts`), tsc can; see `upload-router.ts`
  /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
  const image = sharp(photo, { limitInputPixels: 8000 * 8000 });
  const { format } = await image.metadata();
  if (format === 'svg') throw new Error('An SVG is no photo');
  return image
    .rotate()
    .resize(PICTURE_SIZE, PICTURE_SIZE, { fit: 'cover', position: 'attention' })
    .webp({ quality: 80 })
    .toBuffer();
  /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
};

/**
 * Makes a picture the user's, or with `undefined` removes theirs. The version goes to the user,
 * which mirrors it to Postgres, where the picture route reads it; the previous picture is
 * deleted after that, so no reader ever points at a missing one.
 */
export const setProfilePicture = async (
  payload: BasePayload,
  userId: string,
  avatar: Buffer | undefined,
  previousVersion: string | undefined,
): Promise<string | undefined> => {
  let version: string | undefined;
  if (avatar !== undefined) {
    version = createHash('sha256').update(avatar).digest('hex').slice(0, 16);
    await s3Client.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: profilePictureKey(userId, version),
        Body: avatar,
        ContentType: 'image/webp',
      }),
    );
  }

  await payload.update({
    collection: 'users',
    id: userId,
    // eslint-disable-next-line unicorn/no-null
    data: { profilePictureVersion: version ?? null },
    overrideAccess: true,
    context: { [PROFILE_PICTURE_UPLOAD_CONTEXT]: true },
  });

  if (previousVersion !== undefined && previousVersion !== version) {
    await s3Client
      .send(
        new DeleteObjectCommand({
          Bucket: S3_BUCKET_NAME,
          Key: profilePictureKey(userId, previousVersion),
        }),
      )
      .catch((error: unknown) => {
        // an orphan in the bucket costs a few kilobytes; nobody can reach it any more
        logger.warn('Could not delete the previous profile picture', { error, 'user.id': userId });
      });
  }
  return version;
};
