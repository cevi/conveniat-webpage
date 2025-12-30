import type React from 'react';

/**
 * Skeleton loading component for the Settings page.
 * Shows profile, language switcher, and push notification section placeholders.
 */
export default function SettingsLoading(): React.ReactNode {
  return (
    <div className="fixed top-[62px] left-0 z-30 h-[calc(100dvh-62px)] w-full overflow-y-auto bg-[#f8fafc] xl:left-[480px] xl:w-[calc(100dvw-480px)]">
      <section className="container mx-auto mt-8 py-6">
        <div className="mx-auto w-full max-w-2xl space-y-6 px-8">
          {/* Profile Details Skeleton */}
          <article className="mx-auto w-full max-w-2xl space-y-10">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 animate-pulse rounded-full bg-gray-200" />
                <div className="space-y-2">
                  <div className="h-5 w-32 animate-pulse rounded bg-gray-200" />
                  <div className="h-4 w-48 animate-pulse rounded bg-gray-200" />
                </div>
              </div>
            </div>
          </article>

          {/* Language Switcher Skeleton */}
          <article className="my-8 rounded-lg border-2 border-gray-200 bg-white px-6 py-6 md:p-8">
            <div className="space-y-3">
              <div className="h-5 w-24 animate-pulse rounded bg-gray-200" />
              <div className="flex gap-2">
                {[1, 2, 3].map((index) => (
                  <div key={index} className="h-10 w-16 animate-pulse rounded-lg bg-gray-200" />
                ))}
              </div>
            </div>
          </article>

          {/* Push Notification Settings Skeleton */}
          <article className="rounded-lg border-2 border-gray-200 bg-white p-6">
            <div className="space-y-4">
              <div className="h-5 w-40 animate-pulse rounded bg-gray-200" />
              <div className="space-y-3">
                {[1, 2].map((index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="h-4 w-48 animate-pulse rounded bg-gray-200" />
                    <div className="h-6 w-12 animate-pulse rounded-full bg-gray-200" />
                  </div>
                ))}
              </div>
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}
