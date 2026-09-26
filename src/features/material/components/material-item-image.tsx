import { cn } from '@/utils/tailwindcss-override';
import type React from 'react';

/**
 * The article photo, or its initial on a tile when there is none.
 *
 * A plain `<img>`, not `next/image`: the material team can point an article at any host, and
 * the J+S photos come from an image CDN that already resizes them.
 */
export const MaterialItemImage: React.FC<{
  name: string;
  imageUrl: string | null;
  className?: string;
}> = ({ name, imageUrl, className }) => {
  if (imageUrl === null || imageUrl === '') {
    return (
      <div
        className={cn(
          'bg-conveniat-green/10 text-conveniat-green flex shrink-0 items-center justify-center rounded-lg font-semibold',
          className,
        )}
        aria-hidden
      >
        {name.slice(0, 1).toUpperCase()}
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imageUrl}
      alt={name}
      loading="lazy"
      decoding="async"
      className={cn('shrink-0 rounded-lg bg-gray-100 object-cover', className)}
    />
  );
};
