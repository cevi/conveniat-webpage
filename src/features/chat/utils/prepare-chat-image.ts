import { loadHeicDecoder } from '@/utils/heic-decoder';

/**
 * The long edge a chat photo is sent at. WhatsApp's standard quality uses the same, which is
 * sharp on a phone screen and a few hundred kilobytes over camp wifi instead of megabytes.
 */
export const CHAT_IMAGE_MAX_EDGE = 1600;

/** The JPEG quality a chat photo is sent at, in WhatsApp's range of roughly 70 to 80. */
export const CHAT_IMAGE_JPEG_QUALITY = 0.8;

/**
 * Whether a picked file is HEIC or HEIF, the format iPhones take photos in. Some Android
 * pickers report no type for it, so the name counts too.
 */
export const isHeicFile = (file: File): boolean =>
  /^image\/hei[cf](-sequence)?$/.test(file.type) || /\.hei[cf]$/i.test(file.name);

/** The size an image of `width` × `height` is sent at: its long edge at most `maxEdge`. */
export const scaledSize = (
  width: number,
  height: number,
  maxEdge: number = CHAT_IMAGE_MAX_EDGE,
): { width: number; height: number } => {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
};

const decode = async (file: File): Promise<ImageBitmap> => {
  try {
    // Without options: the default applies the EXIF orientation, and `imageOrientation:
    // 'from-image'` is only known since Safari 17 and Chrome 111, which refuse it before.
    return await createImageBitmap(file);
  } catch (error) {
    // Safari decodes HEIC itself. Elsewhere the decoder is only fetched now, for the first
    // HEIC this browser cannot open; libheif turns the photo upright itself.
    if (!isHeicFile(file)) throw error;
    const heicTo = await loadHeicDecoder();
    return heicTo({ blob: file, type: 'bitmap' });
  }
};

const encodeJpeg = (bitmap: ImageBitmap, width: number, height: number): Promise<Blob> => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (context === null) return Promise.reject(new Error('No 2D canvas to encode the image'));
  // a transparent PNG would turn black in a JPEG
  context.fillStyle = 'white';
  context.fillRect(0, 0, width, height);
  context.imageSmoothingQuality = 'high';
  context.drawImage(bitmap, 0, 0, width, height);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        // iOS Safari counts a canvas's memory until it is collected, unless it is emptied
        canvas.width = 0;
        canvas.height = 0;
        if (blob === null) reject(new Error('Could not encode the image'));
        else resolve(blob);
      },
      'image/jpeg',
      CHAT_IMAGE_JPEG_QUALITY,
    );
  });
};

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
  const bitmap = await decode(file);
  try {
    const size = scaledSize(bitmap.width, bitmap.height);
    const jpeg = await encodeJpeg(bitmap, size.width, size.height);
    const name = file.name.replace(/\.[^./]*$/, '') || 'image';
    return new File([jpeg], `${name}.jpg`, { type: 'image/jpeg' });
  } finally {
    bitmap.close();
  }
};
