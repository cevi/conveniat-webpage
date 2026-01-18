import { MINIO_BUCKET_NAME, s3Client, s3ClientPublic } from '@/lib/s3';
import { createTRPCRouter, trpcBaseProcedure } from '@/trpc/init';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import config from '@payload-config';
import { TRPCError } from '@trpc/server';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { getPayload } from 'payload';
import sharp from 'sharp';
import { z } from 'zod';

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

export const uploadRouter = createTRPCRouter({
  getPresignedUrl: trpcBaseProcedure
    .input(
      z.object({
        filename: z.string(),
        contentType: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const uuid = randomUUID();
      const key = `temp/${uuid}-${input.filename}`;

      const command = new PutObjectCommand({
        Bucket: MINIO_BUCKET_NAME,
        Key: key,
        ContentType: input.contentType,
      });

      const url = await getSignedUrl(s3ClientPublic, command, { expiresIn: 3600 });

      return {
        url,
        key,
      };
    }),

  completeUserUpload: trpcBaseProcedure
    .input(
      z.object({
        key: z.string(),
        description: z.string(),
        originalFilename: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // Fetch file from S3
      const getCommand = new GetObjectCommand({
        Bucket: MINIO_BUCKET_NAME,
        Key: input.key,
      });

      try {
        const s3Response = await s3Client.send(getCommand);
        const fileBody = await s3Response.Body?.transformToByteArray();

        if (!fileBody) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'File not found in temporary storage',
          });
        }

        const buffer = Buffer.from(fileBody);

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
          const metadata = await sharp(buffer).metadata();
          // Ensure sharp recognized it as a valid image and it's not an SVG (for security)
          if (metadata.format === 'svg') {
            throw new Error('Invalid image format');
          }

          // Validate file size (max 50MB)
          const MAX_SIZE = 50 * 1024 * 1024; // 50MB
          if (buffer.length > MAX_SIZE) {
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
        } catch (error) {
          console.error('Image validation failed:', error);
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message:
              'Invalid image data. The file appears to be corrupted or not a supported image.',
          });
        }

        const payload = await getPayload({ config });

        // Create Payload entry
        await payload.create({
          collection: 'userSubmittedImages',
          data: {
            uploaded_by: ctx.user.uuid,
            user_description: input.description,
            original_filename: input.originalFilename,
          },
          file: {
            data: buffer,
            mimetype: s3Response.ContentType ?? 'application/octet-stream',
            name: `${randomUUID()}.${extension}`,
            size: buffer.length,
          },
        });

        // Cleanup temp file
        try {
          const deleteCommand = new DeleteObjectCommand({
            Bucket: MINIO_BUCKET_NAME,
            Key: input.key,
          });
          await s3Client.send(deleteCommand);
        } catch (cleanupError) {
          console.error('Failed to cleanup temporary file:', cleanupError);
          // We don't throw here because the main operation succeeded
        }

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error('Failed to complete upload:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to process uploaded file',
        });
      }
    }),
});
