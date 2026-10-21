import type React from 'react';

/**
 * Placeholder rows for the chat overview.
 *
 * Shared between the route level `loading.tsx` and the client component so
 * that both show the exact same list shape and no layout shift occurs when
 * the cached chats are rendered.
 */
export const ChatsOverviewSkeleton: React.FC = () => (
  <div className="border-line divide-line divide-y overflow-hidden rounded-[14px] border bg-white">
    {[1, 2, 3, 4, 5].map((index) => (
      <div key={index} className="flex min-h-[72px] items-center gap-3 px-4 py-3">
        <div className="bg-quiet h-11 w-11 shrink-0 animate-pulse rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="bg-quiet h-4 w-32 animate-pulse rounded" />
            <div className="bg-quiet h-3 w-10 animate-pulse rounded" />
          </div>
          <div className="bg-quiet h-3 w-48 animate-pulse rounded" />
        </div>
      </div>
    ))}
  </div>
);
