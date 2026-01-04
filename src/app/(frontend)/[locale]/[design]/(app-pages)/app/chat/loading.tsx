import type React from 'react';

/**
 * Skeleton loading component for the Chat overview page.
 * Shows chat list placeholders.
 */
export default function ChatLoading(): React.ReactNode {
  return (
    <div className="fixed top-[62px] left-0 z-30 flex h-[calc(100dvh-62px-0px)] w-full flex-col overflow-y-hidden bg-[#f8fafc] xl:left-[480px] xl:w-[calc(100dvw-480px)]">
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="space-y-3">
          {/* Chat list items skeleton */}
          {[1, 2, 3, 4, 5].map((index) => (
            <div key={index} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className="h-12 w-12 flex-shrink-0 animate-pulse rounded-full bg-gray-200" />

                {/* Chat info */}
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
                    <div className="h-3 w-16 animate-pulse rounded bg-gray-200" />
                  </div>
                  <div className="h-3 w-48 animate-pulse rounded bg-gray-200" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
