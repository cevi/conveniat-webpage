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
 * The box is the one the SVG had, so callers keep passing their own height cap. The asset
 * carries the blur bleed as transparent padding, so the mark only fills
 * `384 / (384 + 2 * 64)` of that box; `scale-[1.3333333]` takes the padding back out, which
 * holds the mark at the size and position it had at every viewport. Sizing the box up instead
 * would shrink the mark by a quarter wherever the container clamps it (narrow phones) and
 * push it down the page everywhere else. Both the padding and the blur come from
 * `src/scripts/generate-background-logo.tsx`.
 */
export const BackgroundLogo: React.FC<{ className?: string }> = ({ className }) => (
  <img
    src="/background-logo-blurred.webp"
    alt=""
    aria-hidden="true"
    decoding="async"
    fetchPriority="low"
    className={cn(
      'mx-auto h-full w-full max-w-[384px] scale-[1.3333333] object-contain opacity-10',
      className,
    )}
  />
);
