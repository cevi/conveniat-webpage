import { Ability } from '@/lib/ability';
import { CapabilityAction, CapabilitySubject } from '@/lib/capabilities/types';
import { MINIO_BUCKET_NAME, s3ClientPublic } from '@/lib/s3';
import { trpcBaseProcedure } from '@/trpc/init';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { z } from 'zod';

export const getDownloadUrl = trpcBaseProcedure
  .input(
    z.object({
      chatId: z.string().uuid(),
      key: z.string(),
    }),
  )
  .query(async ({ input }) => {
    const { chatId, key } = input;

    // 1. Check if user is a member of the chat
    const canRead = await Ability.can(CapabilityAction.View, CapabilitySubject.Messages, chatId);
    if (!canRead) {
      throw new Error('You do not have permission to view this image.');
    }

    // 2. Generate pre-signed GET URL
    const command = new GetObjectCommand({
      Bucket: MINIO_BUCKET_NAME,
      Key: key,
    });

    const url = await getSignedUrl(s3ClientPublic, command, { expiresIn: 3600 });

    return {
      url,
    };
  });
