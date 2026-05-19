import type React from 'react';

/**
 * Skeleton loading component for the Department Helper Portal.
 */
export default function DepartmentHelperPortalLoading(): React.ReactNode {
  return (
    <div className="fixed top-[62px] left-0 z-30 h-[calc(100dvh-62px)] w-full overflow-y-auto bg-[#f8fafc] xl:left-[480px] xl:w-[calc(100dvw-480px)]">
      <section className="container mx-auto mt-8 py-6">
        <article className="mx-auto w-full max-w-2xl space-y-6 px-4">
          {/* Header Skeleton */}
          <div className="space-y-2">
            <div className="h-8 w-64 animate-pulse rounded bg-gray-200" />
            <div className="h-4 w-full animate-pulse rounded bg-gray-200" />
          </div>

          {/* List Skeletons */}
          <div className="space-y-4">
            {[1, 2, 3, 4].map((index) => (
              <div
                key={index}
                className="flex items-center gap-4 rounded-lg border border-gray-100 bg-white p-4 shadow-sm"
              >
                <div className="h-12 w-12 animate-pulse rounded-full bg-gray-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-gray-200" />
                </div>
                <div className="h-8 w-20 animate-pulse rounded bg-gray-200" />
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
