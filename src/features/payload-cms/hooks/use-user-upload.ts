import type { UploadReturnType } from '@/features/payload-cms/components/user-upload/upload-user-image';
import type { UserImageContentType } from '@/features/payload-cms/constants/user-image-upload';
import { trpc } from '@/trpc/client';
import { TRPCClientError } from '@trpc/client';
import { useCallback, useState } from 'react';

/** `isRetryable` marks a failure that says nothing about the image, like the rate limit. */
export type UserUploadResult = UploadReturnType & { isRetryable: boolean };

interface UseUserUploadResult {
  uploadImage: (file: File, description: string) => Promise<UserUploadResult>;
  isUploading: boolean;
}

export const useUserUpload = (): UseUserUploadResult => {
  const [activeUploads, setActiveUploads] = useState(0);
  const isUploading = activeUploads > 0;
  const getPresignedUrlMutation = trpc.upload.createUploadUrl.useMutation();
  const completeUploadMutation = trpc.upload.completeUserUpload.useMutation();

  const uploadImage = useCallback(
    async (file: File, description: string): Promise<UserUploadResult> => {
      try {
        setActiveUploads((previous) => previous + 1);

        // Get presigned URL
        const { url, key } = await getPresignedUrlMutation.mutateAsync({
          // the server knows the allowed types; an unknown one is turned away there
          contentType: file.type as UserImageContentType,
          contentLength: file.size,
        });

        // Upload to S3
        const uploadResponse = await fetch(url, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type,
          },
        });

        if (!uploadResponse.ok) {
          console.error('S3 Upload Failed', uploadResponse);
          throw new Error('Upload to storage failed');
        }

        // Complete upload on server (induce Payload ingestion)
        await completeUploadMutation.mutateAsync({
          key,
          description,
          originalFilename: file.name,
        });

        return {
          error: false,
          message: 'Ok',
          isRetryable: false,
        };
      } catch (error) {
        // console.error('Upload flow failed:', error);
        return {
          error: true,
          message: error instanceof Error ? error.message : 'Unknown upload error',
          isRetryable:
            error instanceof TRPCClientError &&
            (error.data as { code?: string } | undefined)?.code === 'TOO_MANY_REQUESTS',
        };
      } finally {
        setActiveUploads((previous) => previous - 1);
      }
    },
    [getPresignedUrlMutation, completeUploadMutation],
  );

  return {
    uploadImage,
    isUploading,
  };
};
