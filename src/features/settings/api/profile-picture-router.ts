import {
  setProfilePicture,
  toAvatar,
} from '@/features/payload-cms/payload-cms/utils/profile-pictures';
import prisma from '@/lib/db/prisma';
import { S3_BUCKET_NAME, s3Client, s3ClientPublic } from '@/lib/s3';
import { createTRPCRouter, trpcBaseProcedure } from '@/trpc/init';
import { profilePictureUrlOrUndefined } from '@/utils/profile-picture-url';
import { createLogger } from '@/utils/server-logger';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import config from '@payload-config';
import { TRPCError } from '@trpc/server';
import { randomUUID } from 'node:crypto';
import { getPayload } from 'payload';
import { z } from 'zod';

const logger = createLogger('settings:profile-picture');

/** The phone shrinks the photo before it uploads it; this only stops an abuse of the URL. */
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

/** Where a user's upload waits until they confirm it; nobody else can confirm it. */
const uploadPrefixOf = (userId: string): string => `profile-pictures/uploads/${userId}/`;

const currentVersionOf = async (userId: string): Promise<string | undefined> => {
  const user = await prisma.user.findUnique({
    where: { uuid: userId },
    select: { profilePictureVersion: true },
  });
  return user?.profilePictureVersion ?? undefined;
};

/**
 * The profile picture a user uploads in the settings. Visible to every logged-in user, like the
 * address book it appears in.
 */
export const profilePictureRouter = createTRPCRouter({
  /** A URL the phone uploads the photo to directly, so it does not pass through the app. */
  createProfilePictureUploadUrl: trpcBaseProcedure
    .input(z.object({ contentType: z.string().regex(/^image\/(jpeg|png|webp|heic|heif)$/) }))
    .mutation(async ({ ctx, input }) => {
      const key = `${uploadPrefixOf(ctx.user.uuid)}${randomUUID()}`;
      const url = await getSignedUrl(
        s3ClientPublic,
        new PutObjectCommand({ Bucket: S3_BUCKET_NAME, Key: key, ContentType: input.contentType }),
        { expiresIn: 600 },
      );
      return { url, key };
    }),

  /** Makes an uploaded photo the user's picture, as a small square. */
  updateProfilePicture: trpcBaseProcedure
    .input(z.object({ key: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.uuid;
      if (!input.key.startsWith(uploadPrefixOf(userId)) || input.key.includes('..')) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not your upload' });
      }

      let avatar: Buffer;
      try {
        const upload = await s3Client.send(
          new GetObjectCommand({ Bucket: S3_BUCKET_NAME, Key: input.key }),
        );
        if ((upload.ContentLength ?? 0) > MAX_UPLOAD_BYTES) throw new Error('Upload too large');
        const bytes = await upload.Body?.transformToByteArray();
        if (bytes === undefined) throw new Error('Upload is empty');
        avatar = await toAvatar(Buffer.from(bytes));
      } catch (error: unknown) {
        logger.warn('Refused an uploaded profile picture', { error, 'user.id': userId });
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Not a readable photo' });
      } finally {
        await s3Client
          .send(new DeleteObjectCommand({ Bucket: S3_BUCKET_NAME, Key: input.key }))
          .catch((error: unknown) => {
            logger.warn('Could not delete an uploaded profile picture', {
              error,
              'user.id': userId,
            });
          });
      }

      const payload = await getPayload({ config });
      const version = await setProfilePicture(
        payload,
        userId,
        avatar,
        await currentVersionOf(userId),
      );
      logger.info('Set a profile picture', { 'user.id': userId });
      return { pictureUrl: profilePictureUrlOrUndefined(userId, version) };
    }),

  /** Removes the user's picture; their initials show again. */
  deleteProfilePicture: trpcBaseProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.user.uuid;
    const previousVersion = await currentVersionOf(userId);
    if (previousVersion === undefined) return { pictureUrl: undefined };
    await setProfilePicture(await getPayload({ config }), userId, undefined, previousVersion);
    logger.info('Removed a profile picture', { 'user.id': userId });
    return { pictureUrl: undefined };
  }),
});
