import type React from 'react';

/**
 * Skeleton loading component for the Emergency page.
 */
export default function EmergencyLoading(): React.ReactNode {
  return (
    <section className="container mx-auto mt-8 py-6">
      <article className="mx-auto w-full max-w-2xl space-y-6 px-8">
        {/* Emergency Header Skeleton */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 animate-pulse rounded-full bg-red-100" />
          <div className="mx-auto mt-4 h-8 w-32 animate-pulse rounded bg-gray-200" />
        </div>

        {/* Emergency Contacts Skeleton */}
        <div className="space-y-4">
          {[1, 2, 3].map((index) => (
            <div key={index} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 animate-pulse rounded-full bg-gray-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-32 animate-pulse rounded bg-gray-200" />
                  <div className="h-4 w-48 animate-pulse rounded bg-gray-200" />
                </div>
                <div className="h-10 w-24 animate-pulse rounded-lg bg-gray-200" />
              </div>
            </div>
          ))}
        </div>

        {/* Emergency Info Skeleton */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="space-y-3">
            <div className="h-5 w-40 animate-pulse rounded bg-gray-200" />
            <div className="h-4 w-full animate-pulse rounded bg-gray-200" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200" />
          </div>
        </div>
      </article>
    </section>
  );
}
