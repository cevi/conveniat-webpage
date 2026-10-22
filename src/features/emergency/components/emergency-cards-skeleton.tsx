import type React from 'react';

/**
 * The emergency cards while they load, in the height of the closed cards they load into: the
 * route's loading screen and the page itself show the same, so nothing jumps.
 */
export const EmergencyCardsSkeleton: React.FC = () => (
  <div className="flex flex-col gap-2.5" aria-hidden="true">
    {[1, 2, 3, 4].map((index) => (
      <div
        key={index}
        className="border-line flex min-h-[62px] items-center gap-3 rounded-[14px] border bg-white px-3.5 py-2.5"
      >
        <div className="bg-danger-soft h-[38px] w-[38px] shrink-0 animate-pulse rounded-[10px]" />
        <div className="flex-1 space-y-1.5">
          <div className="bg-chip h-4 w-1/3 animate-pulse rounded" />
          <div className="bg-quiet h-3 w-1/4 animate-pulse rounded" />
        </div>
      </div>
    ))}
  </div>
);
