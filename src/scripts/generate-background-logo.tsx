/**
 * Regenerates `public/background-logo-blurred.webp`, the pre-blurred backdrop that
 * `BackgroundLogo` renders behind the app.
 *
 * The backdrop used to be the inline `CeviLogo` SVG with a live `blur-md` filter on it.
 * Blurring vector content forces WebKit to rasterize the mark and re-run a box convolution
 * on every paint; on older iOS devices that pinned the CPU hard enough to starve the JS
 * thread and hang app startup (#1657). Baking the same Gaussian into a raster removes the
 * per-paint cost on every device.
 *
 * The blur is applied by the SVG renderer rather than by sharp so that it operates on
 * premultiplied alpha (no dark halo around the transparent edges), and the filter is pinned
 * to `sRGB` because that — not SVG's `linearRGB` default — is the space CSS `filter: blur()`
 * works in.
 *
 * Re-run this whenever `CeviLogo` changes, from inside the dev container (which has sharp):
 *
 *   docker exec conveniat-webpage-payload-1 pnpm exec tsx src/scripts/generate-background-logo.tsx
 */
import { CeviLogo } from '@/components/svg-logos/cevi-logo';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import sharp from 'sharp';

/** Edge length of the mark in CSS pixels, matching the `max-w-[384px]` it is drawn at. */
const MARK_SIZE = 384;

/** Standard deviation of Tailwind's `blur-md`, the filter this asset replaces. */
const BLUR_SIGMA = 12;

/**
 * Transparent margin holding the blur tail that a CSS filter would have painted outside the
 * element box. At >5σ the remaining energy is far below the 10% opacity the mark renders at.
 */
const BLEED = 64;

/**
 * Raster pixels per CSS pixel. The blur leaves no detail finer than {@link BLUR_SIGMA}, so
 * half resolution is still comfortably oversampled — the browser's upscale costs nothing
 * visible and the asset is a quarter of the bytes. It cancels out of the aspect the component
 * relies on, `(MARK_SIZE + 2 * BLEED) / MARK_SIZE`.
 */
const RESOLUTION_SCALE = 0.5;

const CANVAS_SIZE = (MARK_SIZE + 2 * BLEED) * RESOLUTION_SCALE;

const OUTPUT_PATH = path.join(process.cwd(), 'public', 'background-logo-blurred.webp');

/**
 * Renders `CeviLogo` as standalone SVG markup, scaled and inset so that it sits centred in
 * a {@link CANVAS_SIZE} canvas with {@link BLEED} of room on every side.
 */
const renderInsetMark = (): string => {
  const markup = renderToStaticMarkup(<CeviLogo />);
  const inset = markup
    .replace(
      'width="32"',
      `width="${MARK_SIZE * RESOLUTION_SCALE}" x="${BLEED * RESOLUTION_SCALE}"`,
    )
    .replace(
      'height="32"',
      `height="${MARK_SIZE * RESOLUTION_SCALE}" y="${BLEED * RESOLUTION_SCALE}"`,
    );

  if (inset === markup) {
    throw new Error('CeviLogo no longer declares width="32" height="32" — update this script.');
  }

  return inset;
};

/**
 * Rasterizes an SVG document to WebP.
 *
 * sharp's own types do not resolve under the ESLint project service, so every call through it
 * trips the `no-unsafe-*` rules — the same reason `upload-router.ts` suppresses them. Keeping
 * the untyped surface to this one function lets the rest of the script stay type-checked.
 */
/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
const rasterizeToWebp = async (svg: string): Promise<Buffer> => {
  return await sharp(Buffer.from(svg))
    .webp({ quality: 80, alphaQuality: 80, effort: 6 })
    .toBuffer();
};
/* eslint-enable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */

const generate = async (): Promise<void> => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS_SIZE}" height="${CANVAS_SIZE}" viewBox="0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}">
  <filter id="blur" x="-25%" y="-25%" width="150%" height="150%" color-interpolation-filters="sRGB">
    <feGaussianBlur stdDeviation="${BLUR_SIGMA * RESOLUTION_SCALE}" />
  </filter>
  <g filter="url(#blur)">${renderInsetMark()}</g>
</svg>`;

  const webp = await rasterizeToWebp(svg);
  await writeFile(OUTPUT_PATH, webp);

  process.stdout.write(`wrote ${OUTPUT_PATH} (${CANVAS_SIZE}px, ${webp.length} bytes)\n`);
};

await generate();
