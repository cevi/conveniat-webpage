/** The shorter and the longer side a submitted photo needs at least, in pixels, either way up. */
export const MIN_IMAGE_SHORT_SIDE = 1080;
export const MIN_IMAGE_LONG_SIDE = 1920;

/** Whether a photo is large enough to be used, in landscape or in portrait. */
export const isLargeEnough = (width: number, height: number): boolean =>
  Math.min(width, height) >= MIN_IMAGE_SHORT_SIDE && Math.max(width, height) >= MIN_IMAGE_LONG_SIDE;
