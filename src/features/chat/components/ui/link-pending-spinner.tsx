'use client';

import { cn } from '@/utils/tailwindcss-override';
import { Loader2 } from 'lucide-react';
import { useLinkStatus } from 'next/link';
import type React from 'react';

/**
 * What a link shows, crossfaded to a spinner while its navigation takes a while, as it does
 * offline, so a tap is not mistaken for one that did nothing. A navigation the router answers
 * from its cache still takes a render, about 160 ms on a Pixel 6, so the spinner waits half a
 * second and never flashes on a tap that is fast. Both stay in place, so nothing moves.
 * Must sit inside the `Link`.
 */
export const LinkPendingSpinner: React.FC<{
  children: React.ReactNode;
  /** the size and colour of the spinner, which takes the place of the children at their end */
  spinnerClassName: string;
  /** what a screen reader hears while the navigation is pending */
  pendingLabel?: string;
  className?: string;
}> = ({ children, spinnerClassName, pendingLabel, className }) => {
  const { pending } = useLinkStatus();
  return (
    <span className={cn('relative inline-flex items-center', className)}>
      <span className={cn('inline-flex transition-opacity', pending && 'opacity-0 delay-500')}>
        {children}
      </span>
      <span
        className={cn(
          'absolute inset-y-0 right-0 flex items-center opacity-0 transition-opacity',
          pending && 'opacity-100 delay-500',
        )}
        aria-hidden="true"
      >
        <Loader2 className={cn('animate-spin', spinnerClassName)} />
      </span>
      {pending && pendingLabel !== undefined && <span className="sr-only">{pendingLabel}</span>}
    </span>
  );
};
