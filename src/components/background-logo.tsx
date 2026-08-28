import { cn } from '@/utils/tailwindcss-override';
import React from 'react';

/**
 * The decorative Cevi mark sitting behind the app.
 *
 * It is a pre-blurred raster rather than the `CeviLogo` SVG under a `blur-md` filter:
 * blurring vector content makes WebKit rasterize the mark and re-run the box convolution on
 * every paint, which pinned the CPU on older iOS devices hard enough to starve the JS thread
 * and hang app startup (#1657).
 *
 * A plain `<img>` over a `public/` asset, not `next/image` — the mark has to paint on the
 * boot screen and while offline, so it is served from the service worker's precache rather
 * than through the `/_next/image` optimiser.
 *
 * The asset carries the blur bleed as transparent padding, so its box is
 * `(384 + 2 * 64) / 384` larger than the `max-w-[384px]` / `max-h-[60vh]` the sharp mark used
 * to occupy; that leaves the mark itself exactly the size it was. Both the padding and the
 * blur come from `src/scripts/generate-background-logo.tsx`.
 */
export const BackgroundLogo: React.FC<{ className?: string }> = ({ className }) => (
  <img
    src="/background-logo-blurred.webp"
    alt=""
    aria-hidden="true"
    decoding="async"
    fetchPriority="low"
    className={cn(
      'mx-auto h-full max-h-[80vh] w-full max-w-[512px] object-contain opacity-10',
      className,
    )}
  />
);
