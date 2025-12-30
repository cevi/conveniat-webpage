import type React from 'react';

/**
 * Skeleton loading component for the Upload Images page.
 */
export default function UploadImagesLoading(): React.ReactNode {
  return (
    <div className="fixed top-[62px] left-0 z-30 h-[calc(100dvh-62px)] w-full overflow-y-auto bg-[#f8fafc] xl:left-[480px] xl:w-[calc(100dvw-480px)]">
      <div className="container mx-auto mt-8 max-w-2xl px-4">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="h-8 w-40 animate-pulse rounded bg-gray-200" />
          <div className="mt-1 h-4 w-64 animate-pulse rounded bg-gray-200" />
        </div>

        {/* Content */}
        <div className="space-y-6 px-6 py-6">
          {/* File Upload Zone Skeleton */}
          <div className="rounded-lg border-2 border-dashed border-gray-200 p-8">
            <div className="space-y-4 text-center">
              <div className="mx-auto h-12 w-12 animate-pulse rounded-full bg-gray-200" />
              <div className="mx-auto h-4 w-48 animate-pulse rounded bg-gray-200" />
              <div className="mx-auto h-10 w-32 animate-pulse rounded-lg bg-gray-200" />
            </div>
          </div>

          {/* Confirmation Checkboxes Skeleton */}
          <div className="space-y-3">
            {[1, 2].map((index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="h-5 w-5 animate-pulse rounded bg-gray-200" />
                <div className="h-4 w-64 animate-pulse rounded bg-gray-200" />
              </div>
            ))}
          </div>

          {/* Submit Button Skeleton */}
          <div className="h-12 w-full animate-pulse rounded-lg bg-gray-200" />
        </div>
      </div>
    </div>
  );
}
