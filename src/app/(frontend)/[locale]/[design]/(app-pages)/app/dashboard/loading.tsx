import type React from 'react';

/**
 * Skeleton loading component for the Dashboard page.
 * Shows feature cards carousel and upcoming events placeholders.
 */
export default function DashboardLoading(): React.ReactNode {
  return (
    <div className="fixed top-[62px] left-0 z-30 h-[calc(100dvh-62px)] w-full overflow-y-auto bg-[#f8fafc] xl:left-[480px] xl:w-[calc(100dvw-480px)]">
      <section className="container mx-auto mt-8 py-6">
        <article className="mx-auto w-full max-w-2xl space-y-6 px-8">
          {/* App Features Section Skeleton */}
          <div>
            <div className="mb-4 h-8 w-48 animate-pulse rounded bg-gray-200" />
            <div className="overflow-x-auto pb-4">
              <div className="flex w-max gap-4">
                {[1, 2, 3, 4].map((index) => (
                  <div
                    key={index}
                    className="h-28 w-72 animate-pulse rounded-lg border border-gray-200 bg-gray-100"
                  >
                    <div className="flex h-full items-center gap-3 p-4">
                      <div className="h-10 w-10 rounded-full bg-gray-200" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-24 rounded bg-gray-200" />
                        <div className="h-3 w-32 rounded bg-gray-200" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Upcoming Events Section Skeleton */}
          <div className="mt-12">
            <div className="mx-auto mb-4 h-6 w-56 animate-pulse rounded bg-gray-200" />
            <div className="space-y-3">
              {[1, 2, 3].map((index) => (
                <div
                  key={index}
                  className="overflow-hidden rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="h-5 w-16 animate-pulse rounded-full bg-gray-200" />
                      <div className="h-5 w-3/4 animate-pulse rounded bg-gray-200" />
                      <div className="flex gap-3">
                        <div className="h-4 w-20 animate-pulse rounded bg-gray-200" />
                        <div className="h-4 w-16 animate-pulse rounded bg-gray-200" />
                      </div>
                    </div>
                    <div className="h-5 w-5 animate-pulse rounded bg-gray-100" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
