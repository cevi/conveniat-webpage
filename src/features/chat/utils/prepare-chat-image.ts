import { decodeImage, encodeJpeg } from '@/utils/image-file';

/**
 * The long edge a chat photo is sent at. WhatsApp's standard quality uses the same, which is
 * sharp on a phone screen and a few hundred kilobytes over camp wifi instead of megabytes.
 */
export const CHAT_IMAGE_MAX_EDGE = 1600;

/** The JPEG quality a chat photo is sent at, in WhatsApp's range of roughly 70 to 80. */
export const CHAT_IMAGE_JPEG_QUALITY = 0.8;

/**
 * The picked image as it is sent in a chat: a JPEG whose long edge is at most
 * {@link CHAT_IMAGE_MAX_EDGE}, turned upright, and without its metadata, so a photo no longer
 * carries where it was taken. HEIC is converted too. A GIF goes as picked, because drawing it
 * would stop its animation.
 *
 * @param file - the image as the user picked it
 * @returns the image to upload
 */
export const prepareChatImage = async (file: File): Promise<File> => {
  if (file.type === 'image/gif') return file;
  const bitmap = await decodeImage(file);
  try {
    const jpeg = await encodeJpeg(bitmap, CHAT_IMAGE_MAX_EDGE, CHAT_IMAGE_JPEG_QUALITY);
    const name = file.name.replace(/\.[^./]*$/, '') || 'image';
    return new File([jpeg], `${name}.jpg`, { type: 'image/jpeg' });
  } finally {
    bitmap.close();
  }
};
