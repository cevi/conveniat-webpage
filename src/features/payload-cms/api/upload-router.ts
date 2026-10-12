import {
  temporaryUploadPrefixOf,
  USER_IMAGE_MAX_BYTES,
  USER_IMAGE_UPLOAD,
} from '@/features/payload-cms/constants/user-image-upload';
import { createPresignedUploadUrl } from '@/lib/presigned-urls';
import { S3_BUCKET_NAME, s3Client } from '@/lib/s3';
import { uploadInputShape } from '@/lib/upload-policy';
import { createTRPCRouter, trpcBaseProcedure } from '@/trpc/init';
import { rateLimit } from '@/trpc/middleware/rate-limit';
import type { StaticTranslationString } from '@/types/types';
import { createLogger } from '@/utils/server-logger';
import { DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import config from '@payload-config';
import { TRPCError } from '@trpc/server';
import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';
import { getPayload } from 'payload';
import sharp from 'sharp';
import { z } from 'zod';

const logger = createLogger('payload-cms:user-upload');

const ALLOWED_EXTENSIONS = [
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'heic',
  'heif',
  'dng',
  'cr2',
  'nef',
  'arw',
];

/** A batch picked in one go passes at once; the window caps what one account can store. */
const UPLOAD_RATE_LIMIT = { limit: 30, windowMs: 10 * 60 * 1000 };

const tooManyUploads: StaticTranslationString = {
  de: 'Du hast gerade sehr viele Bilder hochgeladen. Versuche es in ein paar Minuten nochmals.',
  en: 'You have just uploaded a lot of images. Please try again in a few minutes.',
  fr: "Tu viens de téléverser beaucoup d'images. Réessaie dans quelques minutes.",
};

/**
 * Whether `key` names an upload directly under the user's own temporary prefix, so one user
 * cannot complete, and thereby delete, what another one uploaded.
 */
const isTemporaryUploadOf = (key: string, userId: string): boolean => {
  const prefix = temporaryUploadPrefixOf(userId);
  return key.startsWith(prefix) && /^[^./][^/]*$/.test(key.slice(prefix.length));
};

export const uploadRouter = createTRPCRouter({
  createUploadUrl: trpcBaseProcedure
    .use(
      rateLimit({ name: 'upload.createUploadUrl', message: tooManyUploads, ...UPLOAD_RATE_LIMIT }),
    )
    .input(z.object(uploadInputShape(USER_IMAGE_UPLOAD)))
    .mutation(({ input, ctx }) =>
      createPresignedUploadUrl(USER_IMAGE_UPLOAD, {
        keyPrefix: temporaryUploadPrefixOf(ctx.user.uuid),
        ...input,
      }),
    ),

  completeUserUpload: trpcBaseProcedure
    .use(
      rateLimit({
        name: 'upload.completeUserUpload',
        message: tooManyUploads,
        ...UPLOAD_RATE_LIMIT,
      }),
    )
    .input(
      z.object({
        key: z.string(),
        description: z.string().max(1000),
        originalFilename: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      if (!isTemporaryUploadOf(input.key, ctx.user.uuid)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not your upload' });
      }

      // Fetch file from S3
      const getCommand = new GetObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: input.key,
      });

      try {
        const s3Response = await s3Client.send(getCommand);

        if (s3Response.ContentLength && s3Response.ContentLength > USER_IMAGE_MAX_BYTES) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'File size exceeds 50MB limit',
          });
        }
        const fileBody = await s3Response.Body?.transformToByteArray();

        if (!fileBody) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'File not found in temporary storage',
          });
        }

        const buffer = Buffer.from(fileBody);
        const hash = createHash('sha256').update(buffer).digest('hex');

        // Validate file extension
        const extension = path.extname(input.originalFilename).toLowerCase().slice(1);
        if (!extension || !ALLOWED_EXTENSIONS.includes(extension)) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Invalid file extension .${extension}. Only images (${ALLOWED_EXTENSIONS.join(', ')}) are allowed.`,
          });
        }

        // Validate image content using sharp
        try {
          /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
          const metadata = await sharp(buffer).metadata();
          // Ensure sharp recognized it as a valid image and it's not an SVG (for security)
          if (metadata.format === 'svg') {
            throw new Error('Invalid image format');
          }

          if (buffer.length > USER_IMAGE_MAX_BYTES) {
            throw new Error('File size exceeds 50MB limit');
          }

          // Validate dimensions (min 1920x1080)
          if (
            !metadata.width ||
            !metadata.height ||
            metadata.width < 1920 ||
            metadata.height < 1080
          ) {
            throw new Error('Image dimensions must be at least 1920x1080');
          }
          /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
        } catch (error) {
          logger.info('Refused an uploaded image', { error, 'user.id': ctx.user.uuid });
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message:
              'Invalid image data. The file appears to be corrupted or not a supported image.',
          });
        }

        const payload = await getPayload({ config });

        // Check for duplicates
        const existingImages = await payload.find({
          collection: 'userSubmittedImages',
          where: {
            content_hash: {
              equals: hash,
            },
          },
          depth: 0,
        });

        if (existingImages.totalDocs > 0) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'This image has already been uploaded.',
          });
        }

        // Create Payload entry
        await payload.create({
          collection: 'userSubmittedImages',
          data: {
            uploaded_by: ctx.user.uuid,
            user_description: input.description,
            original_filename: input.originalFilename,
            content_hash: hash,
          },
          file: {
            data: buffer,
            mimetype: s3Response.ContentType ?? 'application/octet-stream',
            name: `${randomUUID()}.${extension}`,
            size: buffer.length,
          },
        });

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        logger.error('Failed to complete upload', { error, 'user.id': ctx.user.uuid });
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to process uploaded file',
        });
      } finally {
        // accepted or refused, the upload has served its purpose; a retry uploads again
        await s3Client
          .send(new DeleteObjectCommand({ Bucket: S3_BUCKET_NAME, Key: input.key }))
          .catch((error: unknown) => {
            logger.warn('Could not delete a temporary upload', { error, 'user.id': ctx.user.uuid });
          });
      }
    }),
});
