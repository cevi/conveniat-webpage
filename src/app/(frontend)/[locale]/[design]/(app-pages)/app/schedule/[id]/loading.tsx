import { ChevronLeft } from 'lucide-react';
import type React from 'react';

/**
 * Skeleton loading component for the Schedule Detail page.
 * Matches the full-screen layout with header, content, and sidebar.
 */
export default function ScheduleDetailLoading(): React.ReactNode {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col overflow-hidden bg-gray-50">
      {/* Header Skeleton */}
      <header className="flex h-16 items-center justify-between gap-3 border-b-2 border-gray-200 bg-white px-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg p-2">
            <ChevronLeft className="h-5 w-5 text-gray-300" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="h-6 w-48 animate-pulse rounded bg-gray-200" />
          </div>
        </div>
        <div className="h-8 w-8 animate-pulse rounded-full bg-gray-200" />
      </header>

      {/* Scrollable Content Skeleton */}
      <div className="flex-1 overflow-y-auto">
        <article className="mx-auto w-full max-w-3xl">
          <div className="flex flex-col lg:flex-row">
            {/* Main Content Skeleton */}
            <div className="flex-1 bg-white p-6">
              {/* Description skeleton - multiple lines */}
              <div className="space-y-3">
                <div className="h-4 w-full animate-pulse rounded bg-gray-200" />
                <div className="h-4 w-5/6 animate-pulse rounded bg-gray-200" />
                <div className="h-4 w-4/5 animate-pulse rounded bg-gray-200" />
                <div className="h-4 w-full animate-pulse rounded bg-gray-200" />
                <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200" />
              </div>

              {/* Organizer contact section skeleton */}
              <div className="mt-8 border-t-2 border-gray-200 pt-6">
                <div className="mb-4 h-4 w-32 animate-pulse rounded bg-gray-200" />
                <div className="flex items-center justify-between gap-4 rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="h-10 w-10 animate-pulse rounded-full bg-gray-200" />
                    <div>
                      <div className="mb-1 h-4 w-24 animate-pulse rounded bg-gray-200" />
                      <div className="h-3 w-32 animate-pulse rounded bg-gray-200" />
                    </div>
                  </div>
                  {/* Chat button */}
                  <div className="h-10 w-10 animate-pulse rounded-lg bg-gray-200" />
                </div>
              </div>
            </div>

            {/* Sidebar Skeleton */}
            <aside className="w-full bg-gray-50/50 p-6 lg:w-80 lg:border-l lg:bg-white">
              <div className="space-y-5">
                {/* Date & Time skeleton */}
                <div className="flex gap-3">
                  <div className="flex h-10 w-10 shrink-0 animate-pulse items-center justify-center rounded-lg bg-blue-100" />
                  <div>
                    <div className="mb-1 h-4 w-28 animate-pulse rounded bg-gray-200" />
                    <div className="h-3 w-16 animate-pulse rounded bg-gray-200" />
                  </div>
                </div>

                {/* Location skeleton */}
                <div className="flex gap-3">
                  <div className="flex h-10 w-10 shrink-0 animate-pulse items-center justify-center rounded-lg bg-orange-100" />
                  <div>
                    <div className="mb-1 h-3 w-12 animate-pulse rounded bg-gray-200" />
                    <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
                  </div>
                </div>

                {/* Target group skeleton */}
                <div className="flex gap-3">
                  <div className="flex h-10 w-10 shrink-0 animate-pulse items-center justify-center rounded-lg bg-purple-100" />
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 h-3 w-16 animate-pulse rounded bg-gray-200" />
                    <div className="h-4 w-full animate-pulse rounded bg-gray-200" />
                  </div>
                </div>

                {/* Enrollment action skeleton */}
                <div className="border-t-2 border-gray-200 pt-5">
                  <div className="h-12 w-full animate-pulse rounded-lg bg-gray-200" />
                </div>
              </div>
            </aside>
          </div>
        </article>

        {/* Bottom padding */}
        <div className="h-8" />
      </div>
    </div>
  );
}
