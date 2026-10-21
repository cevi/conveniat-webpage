import type React from 'react';

/**
 * Skeleton loading component for the Upload Images page: the intro, the drop zone and the
 * upload button.
 */
export default function UploadImagesLoading(): React.ReactNode {
  return (
    <div className="bg-page fixed top-(--app-content-top) left-0 z-30 h-[calc(100dvh-var(--app-content-top))] w-full overflow-y-auto xl:left-[480px] xl:w-[calc(100dvw-480px)]">
      <div className="mx-auto max-w-2xl space-y-6 px-4 pt-4 pb-6">
        <div className="space-y-2">
          <div className="bg-chip h-4 w-full animate-pulse rounded" />
          <div className="bg-chip h-4 w-2/3 animate-pulse rounded" />
        </div>

        <div className="border-rail flex flex-col items-center gap-3 rounded-[14px] border-2 border-dashed bg-white px-6 py-10">
          <div className="bg-tint h-14 w-14 animate-pulse rounded-2xl" />
          <div className="bg-chip h-5 w-40 animate-pulse rounded" />
          <div className="bg-quiet h-3.5 w-32 animate-pulse rounded" />
        </div>

        <div className="bg-quiet h-11 w-full animate-pulse rounded-xl" />
      </div>
    </div>
  );
}
