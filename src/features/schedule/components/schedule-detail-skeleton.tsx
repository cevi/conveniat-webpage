import { Skeleton } from '@/components/ui/skeleton';
import type React from 'react';

/** A block's detail page while it loads: the map on top, then the title and the facts card. */
export const ScheduleDetailSkeleton: React.FC = () => {
  return (
    <div className="mx-auto w-full max-w-xl">
      <Skeleton className="h-[220px] w-full rounded-none" />

      <div className="bg-page relative -mt-4 flex flex-col gap-4 rounded-t-[18px] p-4 sm:p-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-7 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>

        <Skeleton className="h-[180px] w-full rounded-[14px]" />
      </div>
    </div>
  );
};
