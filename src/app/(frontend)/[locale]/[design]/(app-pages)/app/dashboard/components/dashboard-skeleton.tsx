import { cn } from '@/utils/tailwindcss-override';
import type React from 'react';

const pulse = 'animate-pulse bg-quiet';

/** A section label while it loads, in the height of the label it stands for. */
const LabelSkeleton: React.FC<{ width: string }> = ({ width }) => (
  <div className="flex h-4 items-center">
    <div className={cn('h-3 rounded', width, pulse)} />
  </div>
);

/** "Hallo …" and the day while the session is not known yet. */
export const GreetingSkeleton: React.FC = () => (
  <div aria-hidden="true">
    <div className={cn('h-8 w-48 rounded', pulse)} />
    <div className="mt-1 flex h-[22px] items-center">
      <div className={cn('h-4 w-52 rounded', pulse)} />
    </div>
  </div>
);

/** "Jetzt" while the programme loads: the card of the running block and two rows after it. */
export const JetztSkeleton: React.FC = () => (
  <div className="space-y-3" aria-hidden="true">
    <div className="border-line rounded-[14px] border bg-white px-4 py-3.5">
      <div className="flex h-5 items-center justify-between gap-3">
        <div className={cn('h-3.5 w-36 rounded', pulse)} />
        <div className={cn('h-5 w-24 rounded-full', pulse)} />
      </div>
      <div className="mt-1 flex h-[25px] items-center">
        <div className={cn('h-5 w-40 rounded', pulse)} />
      </div>
      <div className="mt-1.5 flex h-[18px] items-center">
        <div className={cn('h-3.5 w-44 rounded', pulse)} />
      </div>
    </div>
    <div className="border-line divide-line divide-y overflow-hidden rounded-[14px] border bg-white">
      {['w-20', 'w-28'].map((width) => (
        <div key={width} className="flex min-h-[52px] items-center gap-3 px-4 py-2.5">
          <div className={cn('h-4 w-12 rounded', pulse)} />
          <div className={cn('h-4 rounded', width, pulse)} />
        </div>
      ))}
    </div>
  </div>
);

/** The "Jetzt" section with its header, for the route's loading screen. */
const JetztSectionSkeleton: React.FC = () => (
  <div className="space-y-2" aria-hidden="true">
    <div className="flex items-center justify-between gap-3">
      <LabelSkeleton width="w-12" />
      <div className={cn('h-3.5 w-28 rounded', pulse)} />
    </div>
    <JetztSkeleton />
  </div>
);

/** "Schnellzugriff" while the CMS configuration has not been loaded yet: a 2×2 grid of tiles. */
export const QuickAccessSkeleton: React.FC = () => (
  <div className="space-y-2" aria-hidden="true">
    <LabelSkeleton width="w-28" />
    <div className="grid grid-cols-2 gap-2.5">
      {['w-20', 'w-24', 'w-24', 'w-20'].map((width, index) => (
        <div
          key={index}
          className="border-line flex min-h-[64px] items-center gap-2.5 rounded-[14px] border bg-white px-3 py-2.5"
        >
          <div className={cn('h-[38px] w-[38px] shrink-0 rounded-[10px]', pulse)} />
          <div className={cn('h-4 rounded', width, pulse)} />
        </div>
      ))}
    </div>
  </div>
);

/**
 * Home while it loads, in the layout it loads into: the greeting, "Jetzt" and the
 * Schnellzugriff. The route's loading screen and the page's own loading states use the same
 * pieces, so nothing jumps when the data arrives.
 */
export const DashboardSkeleton: React.FC = () => (
  <article
    className="mx-auto w-full max-w-2xl space-y-6 px-4 py-5 sm:px-6 md:px-8"
    aria-hidden="true"
  >
    <GreetingSkeleton />
    <JetztSectionSkeleton />
    <QuickAccessSkeleton />
  </article>
);
