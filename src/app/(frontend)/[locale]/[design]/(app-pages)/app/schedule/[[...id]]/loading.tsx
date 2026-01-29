import type React from 'react';

/**
 * Skeleton loading component for the Schedule List page.
 * Matches the layout of ScheduleComponent including:
 * - DateCarousel
 * - SearchFilterBar
 * - ScheduleList with timeline
 */
export default function ScheduleLoading(): React.ReactNode {
  return (
    <div className="fixed top-[62px] left-0 z-30 h-[calc(100dvh-62px)] w-full overflow-y-auto bg-[#f8fafc] xl:left-[480px] xl:w-[calc(100dvw-480px)]">
      <article className="mx-auto w-full max-w-2xl px-4 py-8">
        {/* DateCarousel Skeleton */}
        <div className="flex justify-center">
          <div className="flex items-center gap-2">
            {/* Left arrow */}
            <div className="h-8 w-8 animate-pulse rounded-md bg-gray-200" />

            {/* Date pills container */}
            <div className="flex gap-2 rounded-lg bg-gray-100 p-1">
              {[1, 2, 3, 4, 5].map((index) => (
                <div key={index} className="h-10 w-16 animate-pulse rounded-md bg-gray-200" />
              ))}
            </div>

            {/* Right arrow */}
            <div className="h-8 w-8 animate-pulse rounded-md bg-gray-200" />
          </div>
        </div>

        {/* SearchFilterBar Skeleton */}
        <div className="mt-6 mb-4">
          <div className="flex items-center gap-2">
            {/* Search input */}
            <div className="relative flex-1">
              <div className="h-12 w-full animate-pulse rounded-lg bg-gray-200" />
            </div>

            {/* Filter button */}
            <div className="h-12 w-12 shrink-0 animate-pulse rounded-lg bg-gray-200" />

            {/* Star button */}
            <div className="h-12 w-12 shrink-0 animate-pulse rounded-lg bg-gray-200" />
          </div>
        </div>

        {/* ScheduleList Skeleton with Timeline */}
        <div className="relative min-h-[300px]">
          <div className="relative space-y-6">
            {/* Timeline line */}
            <div className="absolute top-4 bottom-4 left-[23px] w-0.5 bg-gray-200" />

            {/* Schedule item groups */}
            {[1, 2, 3].map((groupIndex) => (
              <div key={groupIndex} className="relative flex gap-4">
                {/* Timeline Time Marker */}
                <div className="z-10 flex w-12 flex-shrink-0 flex-col items-center">
                  <div className="flex h-12 w-12 animate-pulse items-center justify-center rounded-full border border-gray-200 bg-gray-100" />
                </div>

                {/* Schedule item cards for this time slot */}
                <div className="min-w-0 flex-1 space-y-3 pt-1">
                  {[1, 2].slice(0, groupIndex === 2 ? 1 : 2).map((itemIndex) => (
                    <div
                      key={itemIndex}
                      className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
                    >
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            {/* Category badge */}
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              <div className="h-5 w-16 animate-pulse rounded-full bg-gray-200" />
                            </div>

                            {/* Title */}
                            <div className="mb-2 h-5 w-3/4 animate-pulse rounded bg-gray-200" />

                            {/* Time & Location info */}
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                              <div className="h-4 w-12 animate-pulse rounded bg-gray-200" />
                              <div className="h-4 w-20 animate-pulse rounded bg-gray-200" />
                            </div>
                          </div>

                          {/* Right side: Star and chevron placeholders */}
                          <div className="flex items-center gap-1">
                            <div className="h-8 w-8 animate-pulse rounded-full bg-gray-100" />
                            <div className="h-5 w-5 animate-pulse rounded bg-gray-100" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </article>
    </div>
  );
}
