import type React from 'react';

const pulse = 'bg-quiet animate-pulse';

/**
 * The chat list while it loads: the search, the filter pills and rows divided by a line from the text on, as the
 * loaded list.
 *
 * Shared between the route level `loading.tsx` and the client component so that both show
 * the exact same shape and nothing jumps when the cached chats are rendered.
 */
export const ChatsOverviewSkeleton: React.FC = () => (
  <div className="flex flex-col gap-4" aria-hidden="true">
    <div className="flex flex-col gap-3">
      <div className={`h-[44px] w-full rounded-[12px] ${pulse}`} />
      <div className="flex h-8 gap-2">
        {['w-14', 'w-28', 'w-[84px]'].map((width) => (
          <div key={width} className={`h-8 rounded-full ${width} ${pulse}`} />
        ))}
      </div>
    </div>
    <ul className="border-line -mx-4 border-t bg-white sm:mx-0">
      {[1, 2, 3, 4, 5].map((index) => (
        <li
          key={index}
          className="after:bg-line relative flex min-h-[72px] items-center gap-3 px-4 py-3 after:absolute after:right-0 after:bottom-0 after:left-[72px] after:h-px last:after:hidden"
        >
          <div className={`h-11 w-11 shrink-0 rounded-full ${pulse}`} />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className={`h-4 w-40 rounded ${pulse}`} />
              <div className={`h-3 w-10 rounded ${pulse}`} />
            </div>
            <div className={`h-3.5 w-56 max-w-full rounded ${pulse}`} />
          </div>
        </li>
      ))}
    </ul>
  </div>
);

/** Where "Neuer Chat" floats, while it is not yet known whether the user may start a chat. */
export const NewChatButtonSkeleton: React.FC = () => (
  <div
    aria-hidden="true"
    className={`fixed right-4 bottom-[96px] z-30 h-12 w-[148px] rounded-2xl ${pulse}`}
  />
);
