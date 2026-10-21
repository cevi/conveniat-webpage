import { IconTile } from '@/components/ui/icon-tile';
import type { LucideIcon } from 'lucide-react';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type React from 'react';

/**
 * One row of a facts card: an icon on a soft tile, the fact and a smaller line under it. Rows in
 * one card are divided by an inset line; a row with `href` leads somewhere and says so.
 */
export const FactRow: React.FC<{
  icon: LucideIcon;
  title?: React.ReactNode;
  sub?: React.ReactNode;
  href?: string;
  children?: React.ReactNode;
}> = ({ icon, title, sub, href, children }) => {
  const body = (
    <>
      <IconTile icon={icon} />
      <div className="min-w-0 flex-1">
        {title !== undefined && (
          <div className="text-[15px] leading-5 font-semibold text-green-900">{title}</div>
        )}
        {sub !== undefined && (
          <div className="mt-px text-[13px] leading-[18px] text-green-500">{sub}</div>
        )}
        {children}
      </div>
      {href !== undefined && (
        <ChevronRight className="h-5 w-5 shrink-0 text-green-500" aria-hidden="true" />
      )}
    </>
  );
  const className =
    'focus-visible:focus-ring-inset relative flex min-h-[60px] items-center gap-3 px-3.5 py-2.5 not-first:before:absolute not-first:before:top-0 not-first:before:right-0 not-first:before:left-16 not-first:before:h-px not-first:before:bg-line';
  return href === undefined ? (
    <div className={className}>{body}</div>
  ) : (
    <Link href={href} className={className}>
      {body}
    </Link>
  );
};
