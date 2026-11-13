import {
  readCurrentTermsText,
  termsVersionOf,
} from '@/features/image-submission/api/image-submission-texts';
import {
  temporaryUploadPrefixOf,
  USER_IMAGE_MAX_BYTES,
  USER_IMAGE_UPLOAD,
} from '@/features/payload-cms/constants/user-image-upload';
import { uploadErrorTexts } from '@/features/payload-cms/upload-error-texts';
import { createPresignedUploadUrl } from '@/lib/presigned-urls';
import { S3_BUCKET_NAME, s3Client } from '@/lib/s3';
import { uploadInputShape } from '@/lib/upload-policy';
import { createErrorThrower, invariantError } from '@/trpc/error-formatter';
import { createTRPCRouter, trpcBaseProcedure } from '@/trpc/init';
import { rateLimit } from '@/trpc/middleware/rate-limit';
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

/** Looking at and withdrawing one's own images; far above what anyone does by hand. */
const OWN_IMAGES_RATE_LIMIT = { limit: 60, windowMs: 10 * 60 * 1000 };

/** One of the images a participant submitted and has not withdrawn, as "Meine Bilder" lists it. */
export interface OwnSubmittedImage {
  id: string;
  description: string;
  submittedAt: string;
  /** the small square version, served through the collection's read access */
  thumbnailUrl: string | undefined;
}

const uploadError = createErrorThrower(uploadErrorTexts);
const refuseTooManyUploads = (): TRPCError => uploadError('TOO_MANY_REQUESTS', 'tooManyUploads');
const refuseTooManyRequests = (): TRPCError => uploadError('TOO_MANY_REQUESTS', 'tooManyRequests');

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
      rateLimit({
        name: 'upload.createUploadUrl',
        refuse: refuseTooManyUploads,
        ...UPLOAD_RATE_LIMIT,
      }),
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
        refuse: refuseTooManyUploads,
        ...UPLOAD_RATE_LIMIT,
      }),
    )
    .input(
      z.object({
        key: z.string(),
        description: z.string().max(1000),
        originalFilename: z.string(),
        // optional only so that a page loaded before consent was recorded gets a reason, below
        terms: z
          .object({ locale: z.enum(['de', 'fr', 'en']), version: z.string().max(64) })
          .optional(),
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
        const payload = await getPayload({ config });

        // The image is recorded with the terms the person agreed to, so they must still be the
        // ones the page showed: an editor may have changed them since, or the page predates this.
        const termsLocale = input.terms?.locale ?? 'de';
        const termsText = await readCurrentTermsText(payload, termsLocale);
        if (
          input.terms === undefined ||
          termsText === '' ||
          termsVersionOf(termsText) !== input.terms.version
        ) {
          throw uploadError('PRECONDITION_FAILED', 'termsChanged');
        }

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

        // Check for duplicates; a withdrawn image may be submitted again
        const existingImages = await payload.find({
          collection: 'userSubmittedImages',
          where: {
            content_hash: { equals: hash },
            withdrawn_at: { exists: false },
          },
          depth: 0,
          limit: 1,
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
            terms_consent: {
              accepted_at: new Date().toISOString(),
              locale: termsLocale,
              terms_text: termsText,
            },
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

  getOwnSubmittedImageList: trpcBaseProcedure
    .use(
      rateLimit({
        name: 'upload.getOwnSubmittedImageList',
        refuse: refuseTooManyRequests,
        ...OWN_IMAGES_RATE_LIMIT,
      }),
    )
    .query(async ({ ctx }): Promise<OwnSubmittedImage[]> => {
      const payload = await getPayload({ config });
      const { docs } = await payload.find({
        collection: 'userSubmittedImages',
        where: {
          uploaded_by: { equals: ctx.user.uuid },
          withdrawn_at: { exists: false },
        },
        sort: '-createdAt',
        depth: 0,
        limit: 100,
        pagination: false,
        // the url is computed from the filename, so the whole size is read
        select: { user_description: true, createdAt: true, sizes: { tiny: true } },
      });
      return docs.map((image) => ({
        id: image.id,
        description: image.user_description,
        submittedAt: image.createdAt,
        thumbnailUrl: image.sizes?.tiny?.url ?? undefined,
      }));
    }),

  /**
   * Withdraws one of the user's own images: it leaves their list, and editors see when it was
   * withdrawn. Nothing is deleted, so editors can still find where they used it. Withdrawing it
   * twice, as a replayed or doubled tap does, changes nothing.
   */
  withdrawSubmittedImage: trpcBaseProcedure
    .use(
      rateLimit({
        name: 'upload.withdrawSubmittedImage',
        refuse: refuseTooManyRequests,
        ...OWN_IMAGES_RATE_LIMIT,
      }),
    )
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ input, ctx }): Promise<{ withdrawn: true }> => {
      const payload = await getPayload({ config });
      const image = await payload.findByID({
        collection: 'userSubmittedImages',
        id: input.id,
        depth: 0,
        disableErrors: true,
      });
      // An image editors have since deleted is as gone as a withdrawn one; a list restored from
      // the persisted cache can still offer it.
      if (image === null) return { withdrawn: true };

      const uploadedBy =
        typeof image.uploaded_by === 'object' ? image.uploaded_by.id : image.uploaded_by;
      // our client only offers the user's own images
      if (uploadedBy !== ctx.user.uuid) {
        throw invariantError(
          'FORBIDDEN',
          'Only the person who submitted an image can withdraw it.',
        );
      }
      if (typeof image.withdrawn_at === 'string') return { withdrawn: true };

      await payload.update({
        collection: 'userSubmittedImages',
        id: input.id,
        data: { withdrawn_at: new Date().toISOString() },
      });
      logger.info('A submitted image was withdrawn', {
        'image.id': input.id,
        'user.id': ctx.user.uuid,
      });
      return { withdrawn: true };
    }),
});
