import { loadHeicDecoder } from '@/utils/heic-decoder';

/**
 * Decoding, shrinking and re-encoding a photo the user picked, in the browser. HEIC, the format
 * iPhones take photos in, needs this: the server's sharp has no HEVC decoder.
 */

/**
 * Whether a picked file is HEIC or HEIF. Some Android pickers report no type for it, so the
 * name counts too.
 */
export const isHeicFile = (file: File): boolean =>
  /^image\/hei[cf](-sequence)?$/.test(file.type) || /\.hei[cf]$/i.test(file.name);

/** The size an image of `width` × `height` shrinks to with its long edge at most `maxEdge`. */
export const scaledSize = (
  width: number,
  height: number,
  maxEdge: number,
): { width: number; height: number } => {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
};

/**
 * Decodes a picked image upright. Safari decodes HEIC itself; elsewhere the decoder is only
 * fetched now, for the first HEIC the browser cannot open, see `loadHeicDecoder`.
 *
 * @param file - the image as the user picked it
 * @returns the decoded image; the caller closes it
 */
export const decodeImage = async (file: File): Promise<ImageBitmap> => {
  try {
    // Without options: the default applies the EXIF orientation, and `imageOrientation:
    // 'from-image'` is only known since Safari 17 and Chrome 111, which refuse it before.
    return await createImageBitmap(file);
  } catch (error) {
    // libheif turns the photo upright itself
    if (!isHeicFile(file)) throw error;
    const heicTo = await loadHeicDecoder();
    return heicTo({ blob: file, type: 'bitmap' });
  }
};

/**
 * Encodes a decoded image as a JPEG with its long edge at most `maxEdge`. Drawing it drops its
 * metadata, so a photo no longer carries where it was taken.
 *
 * @param bitmap - the decoded image
 * @param maxEdge - the longest edge the JPEG may have; a smaller image is not enlarged
 * @param quality - the JPEG quality between 0 and 1
 */
export const encodeJpeg = (
  bitmap: ImageBitmap,
  maxEdge: number,
  quality: number,
): Promise<Blob> => {
  const { width, height } = scaledSize(bitmap.width, bitmap.height, maxEdge);
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
      quality,
    );
  });
};
