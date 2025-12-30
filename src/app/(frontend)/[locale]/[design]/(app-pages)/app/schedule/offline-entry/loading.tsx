import type React from 'react';

/**
 * Skeleton loading component for the Offline Entry page.
 */
export default function OfflineEntryLoading(): React.ReactNode {
  return (
    <div className="fixed top-[62px] left-0 z-30 h-[calc(100dvh-62px)] w-full overflow-y-auto bg-[#f8fafc] xl:left-[480px] xl:w-[calc(100dvw-480px)]">
      <section className="container mx-auto mt-8 max-w-lg px-4 py-6">
        <div className="space-y-6">
          <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
          <div className="space-y-3">
            <div className="h-4 w-full animate-pulse rounded bg-gray-200" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200" />
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="space-y-4">
              <div className="h-12 w-full animate-pulse rounded bg-gray-100" />
              <div className="h-10 w-full animate-pulse rounded bg-gray-200" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
