'use client';

import { trpc } from '@/trpc/client';
import { useState } from 'react';

interface IncidentPhotoUpload {
  /** object key to send along with the report, once the upload finished */
  photoKey: string | undefined;
  previewUrl: string | undefined;
  isUploading: boolean;
  upload: (file: File) => Promise<void>;
  clear: () => void;
}

/**
 * Uploads the photo of a damage straight to the bucket through a presigned URL, so the
 * picture does not travel through the app server on camp wifi.
 */
export const useIncidentPhotoUpload = (): IncidentPhotoUpload => {
  const createUploadUrl = trpc.material.createIncidentPhotoUploadUrl.useMutation();
  const [photoKey, setPhotoKey] = useState<string | undefined>();
  const [previewUrl, setPreviewUrl] = useState<string | undefined>();
  const [isUploading, setIsUploading] = useState(false);

  const upload = async (file: File): Promise<void> => {
    setIsUploading(true);
    try {
      const { url, key } = await createUploadUrl.mutateAsync({ contentType: file.type });
      const response = await fetch(url, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });
      if (!response.ok) throw new Error(`Upload failed with ${response.status}`);
      setPhotoKey(key);
      setPreviewUrl(URL.createObjectURL(file));
    } finally {
      setIsUploading(false);
    }
  };

  const clear = (): void => {
    if (previewUrl !== undefined) URL.revokeObjectURL(previewUrl);
    setPhotoKey(undefined);
    setPreviewUrl(undefined);
  };

  return { photoKey, previewUrl, isUploading, upload, clear };
};
