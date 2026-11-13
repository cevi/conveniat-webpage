'use client';

import { cn } from '@/utils/tailwindcss-override';
import { Loader2 } from 'lucide-react';
import Link, { useLinkStatus } from 'next/link';
import type React from 'react';

/**
 * The icon and label of a tab. The tapped tab lights up at once; its icon crossfades to a spinner
 * only when the navigation takes longer than half a second, as it does offline or before the
 * prefetch has arrived, so a fast tap never flashes it. Must sit inside the `Link`.
 */
const NavLinkContent: React.FC<{
  icon: React.ElementType;
  label: string;
  isCurrent: boolean;
  color: string | undefined;
}> = ({ icon: Icon, label, isCurrent, color }) => {
  const { pending } = useLinkStatus();
  const isHighlighted = isCurrent || pending;

  return (
    <>
      <div
        className={cn('relative rounded-xl', {
          'bg-green-200': isHighlighted,
          'bg-red-200': isHighlighted && color === 'red',
        })}
      >
        <Icon
          className={cn('h-9 w-12 px-3 py-1 text-gray-300 transition-opacity', {
            'text-conveniat-green': isHighlighted,
            'text-cevi-red': color === 'red',
            'opacity-0 delay-500': pending,
          })}
        />
        <span
          className={cn(
            'absolute inset-0 flex items-center justify-center opacity-0 transition-opacity',
            pending && 'opacity-100 delay-500',
          )}
          aria-hidden="true"
        >
          <Loader2
            className={cn('text-conveniat-green animate-spin', {
              'text-cevi-red': color === 'red',
            })}
          />
        </span>
      </div>
      <span
        className={cn('mt-1 text-xs font-semibold text-gray-400', {
          'text-conveniat-green font-bold': isHighlighted,
          'text-cevi-red': color === 'red',
        })}
      >
        {label}
      </span>
    </>
  );
};

export const NavLink: React.FC<{
  href: string;
  icon: React.ElementType;
  label: string;
  /** the tab of the page that is shown, announced as the current page */
  isCurrent: boolean;
  color: string | undefined;
  className?: string | undefined;
}> = ({ href, icon, label, isCurrent, color, className }) => (
  <Link
    href={href}
    aria-current={isCurrent ? 'page' : undefined}
    className={cn(
      // keyboard focus like a row: the quiet surface and a ring inside, which the bar would clip
      // outside
      'focus-visible:focus-row relative flex h-full flex-1 flex-col items-center justify-center space-y-1 py-2',
      { 'text-blue-600': isCurrent },
      className,
    )}
  >
    <NavLinkContent icon={icon} label={label} isCurrent={isCurrent} color={color} />
  </Link>
);
