'use client';

import type { QuickAccessTileId } from '@/app/(frontend)/[locale]/[design]/(app-pages)/app/dashboard/utils/quick-access-tiles';
import { parseChosenTiles } from '@/app/(frontend)/[locale]/[design]/(app-pages)/app/dashboard/utils/quick-access-tiles';
import { useCallback, useMemo, useSyncExternalStore } from 'react';

/**
 * Which tiles Home shows is the user's taste on this phone, so it lives in local storage and is
 * never synced. Nothing stored means the default tiles.
 */
const STORAGE_KEY = 'dashboard:quick-access';
const listeners = new Set<() => void>();

const subscribe = (onChange: () => void): (() => void) => {
  listeners.add(onChange);
  globalThis.addEventListener('storage', onChange);
  return (): void => {
    listeners.delete(onChange);
    globalThis.removeEventListener('storage', onChange);
  };
};

const readStored = (): string | null => {
  try {
    return globalThis.localStorage.getItem(STORAGE_KEY);
  } catch {
    // storage turned off, e.g. in a private window
    return null;
  }
};

// the server knows of no choice
const readNothing = (): string | null => null;

const write = (value: string | null): void => {
  try {
    if (value === null) globalThis.localStorage.removeItem(STORAGE_KEY);
    else globalThis.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // not remembered; the default stays
  }
  // the storage event only reaches other tabs
  for (const listener of listeners) listener();
};

/**
 * The tiles the user has chosen for the Schnellzugriff on this phone, in their order, and the
 * ways to change them and to go back to the default.
 */
export const useChosenQuickAccess = (): {
  chosen: QuickAccessTileId[];
  isCustomized: boolean;
  setChosen: (next: readonly QuickAccessTileId[]) => void;
  reset: () => void;
} => {
  const stored = useSyncExternalStore(subscribe, readStored, readNothing);
  const chosen = useMemo(() => parseChosenTiles(stored), [stored]);
  const setChosen = useCallback((next: readonly QuickAccessTileId[]): void => {
    write(JSON.stringify(next));
  }, []);
  const reset = useCallback((): void => write(null), []);
  return { chosen, isCustomized: stored !== null, setChosen, reset };
};
