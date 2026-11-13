'use client';

import { useCallback, useSyncExternalStore } from 'react';

const listeners = new Set<() => void>();

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

// Storage can be blocked, in a private window for one; the intro then shows on every visit.
const readSeen = (storageKey: string): boolean => {
  try {
    return localStorage.getItem(storageKey) === '1';
  } catch {
    return false;
  }
};

/**
 * Whether this browser has seen the introduction stored under `storageKey`, like the image
 * upload's or the forum's, `null` until that is known after hydration. Only a convenience of
 * this device: losing it shows the intro again.
 */
export const useIntroSeen = (
  storageKey: string,
): { introSeen: boolean | null; markIntroSeen: () => void } => {
  const introSeen = useSyncExternalStore<boolean | null>(
    subscribe,
    () => readSeen(storageKey),
    () => null,
  );

  const markIntroSeen = useCallback((): void => {
    try {
      localStorage.setItem(storageKey, '1');
    } catch {
      // nothing to remember it in, see `readSeen`
    }
    for (const listener of listeners) listener();
  }, [storageKey]);

  return { introSeen, markIntroSeen };
};
