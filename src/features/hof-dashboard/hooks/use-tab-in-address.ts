'use client';

import { useCallback, useEffect, useState } from 'react';

/** The tab the address names, or `initial` when it names none of them. */
const tabInAddress = <T extends string>(tabs: readonly T[], initial: T): T => {
  const named = globalThis.location.hash.slice(1);
  return tabs.find((candidate) => candidate === named) ?? initial;
};

/**
 * The open tab, kept in the address as `#material` and the like, so a reload opens it again and
 * a link can point at it. Leaving the overview is a history entry of its own, so the back button
 * returns to it after following a to-do into a form; moving on between the other tabs replaces
 * that entry, so the next step back still leaves the page.
 */
export const useTabInAddress = <T extends string>(
  tabs: readonly T[],
  initial: T,
): [T, (tab: T) => void] => {
  const [tab, setTab] = useState<T>(() => {
    // rendered on the server first, where there is no address to read
    if ((globalThis as { window?: unknown }).window === undefined) return initial;
    return tabInAddress(tabs, initial);
  });

  // back and forward only change the address, so the tab follows it
  useEffect(() => {
    const follow = (): void => setTab(tabInAddress(tabs, initial));
    globalThis.addEventListener('popstate', follow);
    return (): void => globalThis.removeEventListener('popstate', follow);
  }, [tabs, initial]);

  const select = useCallback(
    (next: T): void => {
      setTab(next);
      const { pathname, search, hash } = globalThis.location;
      const target = next === initial ? '' : `#${next}`;
      // the same tab again is no step back
      if (hash === target) return;
      const url = `${pathname}${search}${target}`;
      // not the current state, which marks the entry as the router's own: only then does the
      // Next.js router copy its state over, and handles going back to it without a reload
      if (hash === '') globalThis.history.pushState(undefined, '', url);
      else globalThis.history.replaceState(undefined, '', url);
    },
    [initial],
  );
  return [tab, select];
};
