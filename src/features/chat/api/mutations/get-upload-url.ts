import { Ability } from '@/lib/ability';
import { CapabilityAction, CapabilitySubject } from '@/lib/capabilities/types';
import { MINIO_BUCKET_NAME, s3ClientPublic } from '@/lib/s3';
import { trpcBaseProcedure } from '@/trpc/init';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { z } from 'zod';

export const getUploadUrl = trpcBaseProcedure
  .input(
    z.object({
      chatId: z.string().uuid(),
      fileName: z.string(),
      contentType: z.string(),
    }),
  )
  .mutation(async ({ input }) => {
    const { chatId, fileName, contentType } = input;

    // 1. Check if user is a member of the chat and has PICTURE_UPLOAD capability
    const canUpload = await Ability.can(CapabilityAction.Upload, CapabilitySubject.Images, chatId);
    if (!canUpload) {
      throw new Error('You do not have permission to upload images in this chat.');
    }

    // 2. Generate a unique key for the file
    const fileExtension = fileName.split('.').pop();
    const uniqueFileName = `${chatId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExtension}`;
    const key = `chat-images/${uniqueFileName}`;

    // 3. Generate pre-signed PUT URL
    const command = new PutObjectCommand({
      Bucket: MINIO_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    });

    const url = await getSignedUrl(s3ClientPublic, command, { expiresIn: 3600 });

    return {
      url,
      key,
    };
  });
