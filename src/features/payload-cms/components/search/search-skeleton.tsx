import { Card } from '@/components/ui/card';
import { cn } from '@/utils/tailwindcss-override';
import type React from 'react';

/** A grey bar where text will be; it pulses only for those who did not ask for less motion. */
export const SkeletonBar: React.FC<{ className?: string }> = ({ className }) => (
  <span
    aria-hidden="true"
    className={cn('bg-quiet block rounded-md motion-safe:animate-pulse', className)}
  />
);

const SkeletonRow: React.FC = () => (
  <li className="flex items-start gap-4 px-4 py-4 sm:px-5">
    <SkeletonBar className="h-[38px] w-[38px] shrink-0 rounded-[10px]" />
    <span className="flex flex-1 flex-col gap-2 pt-0.5">
      <SkeletonBar className="h-4 w-1/2" />
      <SkeletonBar className="h-3 w-1/3" />
      <SkeletonBar className="h-3 w-5/6" />
    </span>
  </li>
);

/** The result list while the results of the current query are on their way. */
export const ResultListSkeleton: React.FC<{ rows?: number; className?: string }> = ({
  rows = 4,
  className,
}) => (
  <Card as="ul" divided className={cn(className)}>
    {Array.from({ length: rows }, (_, index) => (
      <SkeletonRow key={index} />
    ))}
  </Card>
);

/** The preview beside the list while its result is on its way. */
export const PreviewSkeleton: React.FC = () => (
  <div className="flex flex-col gap-3">
    <SkeletonBar className="h-4 w-24" />
    <SkeletonBar className="mt-2 h-7 w-2/3" />
    <SkeletonBar className="mt-2 h-16 w-full rounded-[14px]" />
    <SkeletonBar className="mt-3 h-3 w-28" />
    <SkeletonBar className="h-3 w-full" />
    <SkeletonBar className="h-3 w-5/6" />
  </div>
);

/** The rows of the instant search while its results are on their way. */
export const InstantRowsSkeleton: React.FC = () => (
  <div className="flex flex-col gap-1.5 px-3 py-3">
    <SkeletonBar className="mx-1 mb-1.5 h-3 w-20" />
    {Array.from({ length: 4 }, (_, index) => (
      <div key={index} className="bg-quiet/60 flex min-h-14 items-center gap-3 rounded-[10px] px-3">
        <SkeletonBar className="h-9 w-9 shrink-0 rounded-[9px] bg-white" />
        <span className="flex flex-1 flex-col gap-1.5">
          <SkeletonBar className="h-3.5 w-2/3 bg-white" />
          <SkeletonBar className="h-3 w-1/3 bg-white" />
        </span>
      </div>
    ))}
  </div>
);
