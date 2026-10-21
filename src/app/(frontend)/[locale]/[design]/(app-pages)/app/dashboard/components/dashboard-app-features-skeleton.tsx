import type React from 'react';

/**
 * Placeholder for the feature list while the (cached) landing page configuration has not been
 * loaded yet.
 */
export const DashboardAppFeaturesSkeleton: React.FC = () => {
  return (
    <div className="space-y-2" aria-hidden="true">
      <div className="bg-chip h-3 w-24 animate-pulse rounded" />
      <div className="border-line divide-line divide-y rounded-[14px] border bg-white">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="flex items-center gap-3 px-3.5 py-3">
            <div className="bg-tint h-[38px] w-[38px] shrink-0 animate-pulse rounded-[10px]" />
            <div className="flex-1 space-y-2">
              <div className="bg-chip h-4 w-1/3 animate-pulse rounded" />
              <div className="bg-quiet h-3 w-2/3 animate-pulse rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
