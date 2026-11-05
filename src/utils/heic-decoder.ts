import type { heicTo as HeicTo } from 'heic-to/csp';

/**
 * The version of `heic-to` that `build:heic-decoder` copies into `public/`. A test keeps it equal
 * to the installed one, and the file name carries it, so a cached decoder never outlives an
 * update.
 */
export const HEIC_DECODER_VERSION = '1.6.7';

/** Where the decoder is served, outside `/_next/static/chunks/`. */
export const HEIC_DECODER_URL = `/heic-to-${HEIC_DECODER_VERSION}.js`;

/**
 * Loads the HEIC decoder, about 780 kB gzipped, the first time a HEIC needs it. It is a file of
 * its own in `public/`, not a chunk of the build: it is too large for the precache, and a chunk
 * missing from the precache reads as one of an older build to `runsChunkOfAnotherBuild`.
 */
export const loadHeicDecoder = async (): Promise<typeof HeicTo> => {
  const decoder = (await import(
    /* webpackIgnore: true */ /* turbopackIgnore: true */ HEIC_DECODER_URL
  )) as { heicTo: typeof HeicTo };
  return decoder.heicTo;
};
