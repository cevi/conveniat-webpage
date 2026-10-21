import type React from 'react';

/**
 * Skeleton loading component for the Emergency page: the emergency cards and the alarm slider.
 */
export default function EmergencyLoading(): React.ReactNode {
  return (
    <div className="bg-page fixed top-(--app-content-top) left-0 z-30 h-[calc(100dvh-var(--app-content-top))] w-full overflow-y-auto xl:left-[480px] xl:w-[calc(100dvw-480px)]">
      <div className="mx-auto w-full max-w-2xl space-y-2.5 px-4 pt-4 pb-6">
        {[1, 2, 3, 4].map((index) => (
          <div
            key={index}
            className="border-line flex min-h-[60px] items-center gap-3 rounded-[14px] border bg-white px-3.5 py-2.5"
          >
            <div className="h-[38px] w-[38px] shrink-0 animate-pulse rounded-[10px] bg-red-50" />
            <div className="flex-1 space-y-1.5">
              <div className="bg-chip h-4 w-1/3 animate-pulse rounded" />
              <div className="bg-quiet h-3 w-1/4 animate-pulse rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
