import type React from 'react';

/** A placeholder for one settings row: the icon tile, the title and the line below it. */
const RowSkeleton: React.FC = () => (
  <div className="flex min-h-[60px] items-center gap-3 px-3.5 py-2.5">
    <div className="bg-tint h-[38px] w-[38px] shrink-0 animate-pulse rounded-[10px]" />
    <div className="flex-1 space-y-1.5">
      <div className="bg-chip h-4 w-28 animate-pulse rounded" />
      <div className="bg-quiet h-3 w-44 animate-pulse rounded" />
    </div>
  </div>
);

/**
 * Skeleton loading component for the Settings page: the profile card and the app preferences.
 */
export default function SettingsLoading(): React.ReactNode {
  return (
    <div className="bg-page fixed top-(--app-content-top) left-0 z-30 h-[calc(100dvh-var(--app-content-top))] w-full overflow-y-auto xl:left-[480px] xl:w-[calc(100dvw-480px)]">
      <div className="mx-auto w-full max-w-2xl space-y-6 px-4 pt-4 pb-12">
        <div className="space-y-3">
          <div className="border-line divide-line divide-y overflow-hidden rounded-[14px] border bg-white">
            <div className="flex items-center gap-4 p-4">
              <div className="bg-chip h-14 w-14 animate-pulse rounded-full" />
              <div className="space-y-2">
                <div className="bg-chip h-5 w-40 animate-pulse rounded" />
                <div className="bg-quiet h-3.5 w-48 animate-pulse rounded" />
              </div>
            </div>
            {[1, 2, 3, 4].map((index) => (
              <RowSkeleton key={index} />
            ))}
          </div>
          <div className="bg-quiet h-11 animate-pulse rounded-xl" />
        </div>

        <div>
          <div className="bg-chip mb-2 ml-1 h-3 w-32 animate-pulse rounded" />
          <div className="border-line divide-line divide-y overflow-hidden rounded-[14px] border bg-white">
            {[1, 2, 3].map((index) => (
              <RowSkeleton key={index} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
