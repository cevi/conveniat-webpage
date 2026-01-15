import { MINIO_BUCKET_NAME, s3Client, s3ClientPublic } from '@/lib/s3';
import { createTRPCRouter, trpcBaseProcedure } from '@/trpc/init';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import config from '@payload-config';
import { TRPCError } from '@trpc/server';
import { randomUUID } from 'node:crypto';
import { getPayload } from 'payload';
import { z } from 'zod';

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

        const payload = await getPayload({ config });
        const extension = input.originalFilename.split('.').pop();

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
            mimetype: s3Response.ContentType || 'application/octet-stream',
            name: `${randomUUID()}.${extension}`,
            size: buffer.length,
          },
        });

        // Cleanup temp file
        const deleteCommand = new DeleteObjectCommand({
          Bucket: MINIO_BUCKET_NAME,
          Key: input.key,
        });
        await s3Client.send(deleteCommand);

        return { success: true };
      } catch (error) {
        console.error('Failed to complete upload:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to process uploaded file',
        });
      }
    }),
});
