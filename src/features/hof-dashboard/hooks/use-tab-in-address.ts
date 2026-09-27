'use client';

import { useCallback, useState } from 'react';

/**
 * The open tab, kept in the address as `#material` and the like, so a reload opens it again and
 * a link can point at it. Replacing the entry keeps the back button for leaving the page.
 */
export const useTabInAddress = <T extends string>(
  tabs: readonly T[],
  initial: T,
): [T, (tab: T) => void] => {
  const [tab, setTab] = useState<T>(() => {
    // rendered on the server first, where there is no address to read
    if ((globalThis as { window?: unknown }).window === undefined) return initial;
    const named = globalThis.location.hash.slice(1);
    return tabs.find((candidate) => candidate === named) ?? initial;
  });
  const select = useCallback(
    (next: T): void => {
      setTab(next);
      const { pathname, search } = globalThis.location;
      // not the current state, which marks the entry as the router's own: only then does the
      // Next.js router take the new address over
      globalThis.history.replaceState(
        undefined,
        '',
        next === initial ? `${pathname}${search}` : `${pathname}${search}#${next}`,
      );
    },
    [initial],
  );
  return [tab, select];
};
