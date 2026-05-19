import type React from 'react';

/**
 * Skeleton loading component for the Helper Portal.
 */
export default function HelperPortalLoading(): React.ReactNode {
  return (
    <div className="fixed top-[62px] left-0 z-30 h-[calc(100dvh-62px)] w-full overflow-y-auto bg-[#f8fafc] xl:left-[480px] xl:w-[calc(100dvw-480px)]">
      <section className="container mx-auto mt-8 py-6">
        <article className="mx-auto w-full max-w-2xl space-y-6 px-4">
          {/* Header Skeleton */}
          <div className="space-y-2">
            <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
            <div className="h-4 w-full animate-pulse rounded bg-gray-200" />
          </div>

          {/* Card Skeletons */}
          {[1, 2, 3].map((index) => (
            <div key={index} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 flex-shrink-0 animate-pulse rounded-lg bg-gray-100" />
                <div className="flex-1 space-y-3">
                  <div className="h-5 w-32 animate-pulse rounded bg-gray-200" />
                  <div className="h-4 w-full animate-pulse rounded bg-gray-200" />
                </div>
              </div>
            </div>
          ))}
        </article>
      </section>
    </div>
  );
}
