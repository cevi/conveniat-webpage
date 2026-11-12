'use client';

import { useCallback, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'image-submission-intro-seen';

const listeners = new Set<() => void>();

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

// Storage can be blocked, in a private window for one; the intro then shows on every visit.
const readSeen = (): boolean => {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
};

/**
 * Whether this browser has seen the introduction of the image upload, `null` until that
 * is known after hydration. Only a convenience of this device: losing it shows the intro again.
 */
export const useIntroSeen = (): { introSeen: boolean | null; markIntroSeen: () => void } => {
  const introSeen = useSyncExternalStore<boolean | null>(subscribe, readSeen, () => null);

  const markIntroSeen = useCallback((): void => {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // nothing to remember it in, see `readSeen`
    }
    for (const listener of listeners) listener();
  }, []);

  return { introSeen, markIntroSeen };
};
