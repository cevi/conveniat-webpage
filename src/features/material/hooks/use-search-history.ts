'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';

export interface SearchHistory {
  /** opens an editor under `?search`, as its own history entry */
  open: (search: string) => void;
  /** goes back to the plain page */
  close: () => void;
}

/**
 * Opens an editor of a depot page through the query string, so the phone's back gesture
 * closes it instead of leaving the page. The native history API keeps it a client-side change
 * that also works offline; Next.js picks it up in `useSearchParams`. An editor that was opened
 * through a link rather than here has nothing to go back to, so it closes in place.
 */
export const useSearchHistory = (): SearchHistory => {
  const pushed = useRef(false);

  useEffect(() => {
    const forget = (): void => {
      pushed.current = false;
    };
    globalThis.addEventListener('popstate', forget);
    return (): void => globalThis.removeEventListener('popstate', forget);
  }, []);

  const open = useCallback((search: string): void => {
    globalThis.history.pushState(undefined, '', `${globalThis.location.pathname}?${search}`);
    pushed.current = true;
  }, []);

  const close = useCallback((): void => {
    if (pushed.current) {
      pushed.current = false;
      globalThis.history.back();
      return;
    }
    globalThis.history.replaceState(undefined, '', globalThis.location.pathname);
  }, []);

  return useMemo(() => ({ open, close }), [open, close]);
};
