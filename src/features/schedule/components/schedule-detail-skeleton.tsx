import { Skeleton } from '@/components/ui/skeleton';
import type React from 'react';

export const ScheduleDetailSkeleton: React.FC = () => {
  return (
    <div className="flex flex-col gap-6 p-4">
      {/* Hero Image Skeleton */}
      <Skeleton className="aspect-video w-full rounded-xl" />

      {/* Meta Information Skeleton */}
      <div className="flex flex-col gap-4">
        {/* Time Row */}
        <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
          <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>

        {/* Location Row */}
        <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
          <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      </div>

      {/* Description Skeleton */}
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    </div>
  );
};
