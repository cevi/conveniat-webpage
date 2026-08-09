import type React from 'react';

/**
 * Placeholder rows for the chat overview.
 *
 * Shared between the route level `loading.tsx` and the client component so
 * that both show the exact same list shape and no layout shift occurs when
 * the cached chats are rendered.
 */
export const ChatsOverviewSkeleton: React.FC = () => (
  <div className="space-y-3">
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
);
