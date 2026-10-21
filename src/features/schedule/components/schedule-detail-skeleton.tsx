import { Skeleton } from '@/components/ui/skeleton';
import type React from 'react';

/** A block's detail page while it loads: the map on top, then title, chips and place. */
export const ScheduleDetailSkeleton: React.FC = () => {
  return (
    <div className="mx-auto w-full max-w-xl">
      <Skeleton className="h-[300px] w-full rounded-none" />

      <div className="relative -mt-5 flex flex-col gap-4 rounded-t-[20px] bg-gray-50 p-4 sm:p-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-7 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>

        <div className="flex gap-2">
          <Skeleton className="h-10 w-40 rounded-xl" />
          <Skeleton className="h-10 w-32 rounded-xl" />
        </div>

        <Skeleton className="h-16 w-full rounded-2xl" />
      </div>
    </div>
  );
};
