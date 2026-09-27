'use client';

import { useCallback, useState } from 'react';

const STORAGE_KEY = 'hof-dashboard:hof-id';

const readStored = (): string | undefined => {
  // rendered on the server first, where there is no storage
  if ((globalThis as { window?: unknown }).window === undefined) return undefined;
  try {
    return globalThis.localStorage.getItem(STORAGE_KEY) ?? undefined;
  } catch {
    // storage turned off, e.g. in a private window
    return undefined;
  }
};

/**
 * The Hof the user last opened on this device, so an admin of two Höfe who reloads to check an
 * upload finds the same Hof again. A Hof they no longer may open is left to the caller.
 */
export const useRememberedHofId = (): [string | undefined, (hofId: string) => void] => {
  const [hofId, setHofId] = useState(readStored);
  const remember = useCallback((next: string): void => {
    setHofId(next);
    try {
      globalThis.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // not remembered, still opened
    }
  }, []);
  return [hofId, remember];
};
