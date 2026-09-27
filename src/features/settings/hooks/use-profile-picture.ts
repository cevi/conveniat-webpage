'use client';

import { trpc } from '@/trpc/client';
import { useState } from 'react';

/** The longest edge sent over the camp wifi; the server crops it to a 192px square. */
const UPLOAD_EDGE = 768;

/**
 * Shrinks a photo on the phone before it is uploaded, a few megabytes down to a few hundred
 * kilobytes. A browser that cannot decode it, e.g. HEIC outside Safari, uploads the original and
 * lets the server decode it.
 */
const shrinkForUpload = async (file: File): Promise<Blob> => {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, UPLOAD_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', 0.85);
    });
    return blob ?? file;
  } catch {
    return file;
  }
};

interface ProfilePicture {
  pictureUrl: string | undefined;
  isBusy: boolean;
  hasFailed: boolean;
  upload: (file: File) => Promise<void>;
  remove: () => Promise<void>;
}

/**
 * Uploads the user's own profile picture straight to the bucket, then has the server crop it,
 * and removes it again.
 */
export const useProfilePicture = (initialPictureUrl: string | undefined): ProfilePicture => {
  const createUploadUrl = trpc.profilePicture.createProfilePictureUploadUrl.useMutation();
  const updatePicture = trpc.profilePicture.updateProfilePicture.useMutation();
  const deletePicture = trpc.profilePicture.deleteProfilePicture.useMutation();
  const utils = trpc.useUtils();
  const [pictureUrl, setPictureUrl] = useState(initialPictureUrl);
  const [isBusy, setIsBusy] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);

  const run = async (action: () => Promise<string | undefined>): Promise<void> => {
    setIsBusy(true);
    setHasFailed(false);
    try {
      setPictureUrl(await action());
      // the address book and the chats show the new picture on their next refresh
      await utils.chat.invalidate();
    } catch (error: unknown) {
      console.error('Changing the profile picture failed', error);
      setHasFailed(true);
    } finally {
      setIsBusy(false);
    }
  };

  const upload = (file: File): Promise<void> =>
    run(async () => {
      const photo = await shrinkForUpload(file);
      const contentType = photo.type === '' ? 'image/jpeg' : photo.type;
      const { url, key } = await createUploadUrl.mutateAsync({ contentType });
      const response = await fetch(url, {
        method: 'PUT',
        body: photo,
        headers: { 'Content-Type': contentType },
      });
      if (!response.ok) throw new Error(`Upload failed with ${String(response.status)}`);
      const { pictureUrl: uploadedUrl } = await updatePicture.mutateAsync({ key });
      return uploadedUrl;
    });

  const remove = (): Promise<void> =>
    run(async () => {
      const { pictureUrl: remainingUrl } = await deletePicture.mutateAsync();
      return remainingUrl;
    });

  return { pictureUrl, isBusy, hasFailed, upload, remove };
};
