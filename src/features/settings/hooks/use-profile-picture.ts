'use client';
import { useTRPC } from '@/trpc/client';
import { decodeImage, encodeJpeg } from '@/utils/image-file';
import { useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';

/** The longest edge sent over the camp wifi; the server crops it to its 192 and 640px squares. */
const UPLOAD_EDGE = 768;

/**
 * Shrinks a photo on the phone before it is uploaded, a few megabytes down to a few hundred
 * kilobytes, and turns HEIC into a JPEG, which the server's sharp cannot read. A file the browser
 * cannot decode at all goes up as picked, and the server refuses or reads it.
 */
const shrinkForUpload = async (file: File): Promise<Blob> => {
  try {
    const bitmap = await decodeImage(file);
    try {
      return await encodeJpeg(bitmap, UPLOAD_EDGE, 0.85);
    } finally {
      bitmap.close();
    }
  } catch {
    return file;
  }
};

interface ProfilePicture {
  pictureUrl: string | undefined;
  isBusy: boolean;
  hasFailed: boolean;
  /** resolves to whether the picture was changed */
  upload: (file: File) => Promise<boolean>;
  remove: () => Promise<boolean>;
}

/**
 * Uploads the user's own profile picture straight to the bucket, then has the server crop it,
 * and removes it again.
 */
export const useProfilePicture = (initialPictureUrl: string | undefined): ProfilePicture => {
  const trpc = useTRPC();
  const createUploadUrl = useMutation(
    trpc.profilePicture.createProfilePictureUploadUrl.mutationOptions(),
  );
  const updatePicture = useMutation(trpc.profilePicture.updateProfilePicture.mutationOptions());
  const deletePicture = useMutation(trpc.profilePicture.deleteProfilePicture.mutationOptions());
  const queryClient = useQueryClient();
  const [pictureUrl, setPictureUrl] = useState(initialPictureUrl);
  const [isBusy, setIsBusy] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);

  const run = async (action: () => Promise<string | undefined>): Promise<boolean> => {
    setIsBusy(true);
    setHasFailed(false);
    try {
      setPictureUrl(await action());
      // the address book and the chats show the new picture on their next refresh
      await queryClient.invalidateQueries(trpc.chat.pathFilter());
      return true;
    } catch (error: unknown) {
      console.error('Changing the profile picture failed', error);
      setHasFailed(true);
      return false;
    } finally {
      setIsBusy(false);
    }
  };

  const upload = (file: File): Promise<boolean> =>
    run(async () => {
      const photo = await shrinkForUpload(file);
      const contentType = photo.type === '' ? 'image/jpeg' : photo.type;
      const { url, key } = await createUploadUrl.mutateAsync({
        contentType,
        contentLength: photo.size,
      });
      const response = await fetch(url, {
        method: 'PUT',
        body: photo,
        headers: { 'Content-Type': contentType },
      });
      if (!response.ok) throw new Error(`Upload failed with ${String(response.status)}`);
      const { pictureUrl: uploadedUrl } = await updatePicture.mutateAsync({ key });
      return uploadedUrl;
    });

  const remove = (): Promise<boolean> =>
    run(async () => {
      const { pictureUrl: remainingUrl } = await deletePicture.mutateAsync();
      return remainingUrl;
    });

  return { pictureUrl, isBusy, hasFailed, upload, remove };
};
