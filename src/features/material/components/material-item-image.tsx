'use client';

import { cn } from '@/utils/tailwindcss-override';
import { Package } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';

/**
 * The article photo, or a neutral tile when there is none or it does not load.
 *
 * The J+S photos are cut-outs on white, so the photo is shown whole on a white tile rather than
 * cropped to fill it: every article then sits the same way in a list, whatever its shape.
 *
 * A plain `<img>`, not `next/image`: the material team can point an article at any host, and
 * the J+S photos come from an image CDN that already resizes them.
 */
export const MaterialItemImage: React.FC<{
  name: string;
  imageUrl: string | null;
  className?: string;
}> = ({ name, imageUrl, className }) => {
  // the link that failed, not a flag: a fixed link on the same mounted page loads again
  const [failedUrl, setFailedUrl] = useState<string | undefined>();
  const failed = imageUrl !== null && imageUrl === failedUrl;
  const tile =
    'flex shrink-0 items-center justify-center rounded-lg ring-1 ring-gray-200 ring-inset';
  if (imageUrl === null || imageUrl === '' || failed) {
    return (
      <div className={cn(tile, 'bg-gray-50 text-gray-300', className)} aria-hidden>
        <Package className="size-1/2 max-h-8 max-w-8" strokeWidth={1.5} />
      </div>
    );
  }
  return (
    <div className={cn(tile, 'overflow-hidden bg-white p-1', className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt={name}
        loading="lazy"
        decoding="async"
        onError={() => setFailedUrl(imageUrl)}
        className="size-full object-contain"
      />
    </div>
  );
};
