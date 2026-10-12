import type { UploadPolicy } from '@/lib/upload-policy';

/** The photo is uploaded as taken, without resizing, so the size has to fit a full-size phone photo. */
export const INCIDENT_PHOTO_UPLOAD: UploadPolicy = {
  extensions: {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/heic': 'heic',
    'image/heif': 'heif',
  },
  maxBytes: 20 * 1024 * 1024,
};
