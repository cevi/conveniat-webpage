import type React from 'react';

/**
 * Skeleton loading component for the Helper Portal: the day strip and a few shifts on the
 * timeline, in the shapes the page settles into.
 */
export default function HelperPortalLoading(): React.ReactNode {
  return (
    <div className="bg-page fixed top-(--app-content-top) left-0 z-30 h-[calc(100dvh-var(--app-content-top))] w-full overflow-y-auto xl:left-[480px] xl:w-[calc(100dvw-480px)]">
      <article className="mx-auto w-full max-w-2xl p-4 sm:p-6">
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((index) => (
            <div key={index} className="bg-quiet h-[58px] w-[46px] animate-pulse rounded-2xl" />
          ))}
        </div>

        <div className="mt-4 space-y-3.5">
          {[1, 2, 3].map((index) => (
            <div key={index} className="grid grid-cols-[44px_28px_minmax(0,1fr)]">
              <div className="bg-quiet mt-0.5 h-4 w-10 animate-pulse rounded" />
              <div />
              <div className="border-line space-y-2 rounded-[14px] border bg-white px-3.5 py-3">
                <div className="bg-quiet h-3 w-24 animate-pulse rounded" />
                <div className="bg-quiet h-5 w-3/4 animate-pulse rounded" />
                <div className="bg-quiet h-3.5 w-1/2 animate-pulse rounded" />
              </div>
            </div>
          ))}
        </div>
      </article>
    </div>
  );
}
