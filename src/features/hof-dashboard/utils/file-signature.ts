import type { HofFileExtension } from '@/features/hof-dashboard/constants';

const PDF = [0x25, 0x50, 0x44, 0x46];
const ZIP = [0x50, 0x4b, 0x03, 0x04];
const JPEG = [0xff, 0xd8, 0xff];
const PNG = [0x89, 0x50, 0x4e, 0x47];

/** The bytes a file of each type starts with; the Office formats are zip archives. */
const SIGNATURES: Record<HofFileExtension, number[]> = {
  pdf: PDF,
  docx: ZIP,
  xlsx: ZIP,
  pptx: ZIP,
  zip: ZIP,
  jpg: JPEG,
  jpeg: JPEG,
  png: PNG,
};

/**
 * Whether a file starts the way its ending promises. The server checks the content anyway,
 * but only once the whole file is up; checking the first bytes first spares a Hof on camp
 * wifi uploading 20 MB to be told the file is not what it seems.
 */
export const startsLike = (head: Uint8Array, extension: HofFileExtension): boolean =>
  SIGNATURES[extension].every((byte, index) => head[index] === byte);
