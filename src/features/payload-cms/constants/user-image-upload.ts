import type { UploadPolicy } from '@/lib/upload-policy';

/** Image types a participant may hand in, each stored under its own extension. */
export const USER_IMAGE_EXTENSIONS = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
} as const;

export type UserImageContentType = keyof typeof USER_IMAGE_EXTENSIONS;

/** Photos are handed in as taken, without resizing, so this has to fit a camera original. */
export const USER_IMAGE_MAX_BYTES = 50 * 1024 * 1024;

/** What a participant may hand in as a submitted image. */
export const USER_IMAGE_UPLOAD: UploadPolicy<UserImageContentType> = {
  extensions: USER_IMAGE_EXTENSIONS,
  maxBytes: USER_IMAGE_MAX_BYTES,
};

/**
 * The key prefix of one user's waiting uploads, so nobody else can complete them. The storage
 * expires everything under `temp/` after a day, see `docker/seaweedfs-entrypoint.sh`, which
 * removes the uploads nobody completed.
 *
 * @param userId - the uuid of the user who asked for the upload URL
 * @returns `temp/<userId>/`
 */
export const temporaryUploadPrefixOf = (userId: string): string => `temp/${userId}/`;
