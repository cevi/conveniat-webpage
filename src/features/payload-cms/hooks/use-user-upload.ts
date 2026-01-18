import type { UploadReturnType } from '@/features/payload-cms/components/user-upload/upload-user-image';
import { trpc } from '@/trpc/client';
import { useCallback, useState } from 'react';

interface UseUserUploadResult {
  uploadImage: (file: File, description: string) => Promise<UploadReturnType>;
  isUploading: boolean;
}

export const useUserUpload = (): UseUserUploadResult => {
  const [activeUploads, setActiveUploads] = useState(0);
  const isUploading = activeUploads > 0;
  const getPresignedUrlMutation = trpc.upload.createUploadUrl.useMutation();
  const completeUploadMutation = trpc.upload.completeUserUpload.useMutation();

  const uploadImage = useCallback(
    async (file: File, description: string): Promise<UploadReturnType> => {
      try {
        setActiveUploads((previous) => previous + 1);

        // Get presigned URL
        const { url, key } = await getPresignedUrlMutation.mutateAsync({
          filename: file.name,
          contentType: file.type,
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
        };
      } catch (error) {
        console.error('Upload flow failed:', error);
        return {
          error: true,
          message: error instanceof Error ? error.message : 'Unknown upload error',
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
