'use client';

import { useCallback, useMemo, useSyncExternalStore } from 'react';

/**
 * What the user has packed for a block is a note on this phone, nobody else's business and of no
 * use on another device, so it lives in local storage and is never synced.
 */
const storageKeyOf = (entryId: string): string => `schedule-packed:${entryId}`;
const listeners = new Set<() => void>();

const subscribe = (onChange: () => void): (() => void) => {
  listeners.add(onChange);
  globalThis.addEventListener('storage', onChange);
  return (): void => {
    listeners.delete(onChange);
    globalThis.removeEventListener('storage', onChange);
  };
};
// the server knows of nothing packed
// eslint-disable-next-line unicorn/no-null -- the same empty answer local storage gives
const readNothing = (): string | null => null;

const parsePacked = (stored: string | null): ReadonlySet<string> => {
  if (stored === null) return new Set();
  try {
    const parsed: unknown = JSON.parse(stored);
    return new Set(
      Array.isArray(parsed)
        ? parsed.filter((item): item is string => typeof item === 'string')
        : [],
    );
  } catch {
    return new Set();
  }
};

/**
 * The items of a block's "Mitnehmen" list the user has ticked off on this phone. An item is
 * remembered by its text, so one an editor renames is unpacked again, as it should be.
 *
 * @param entryId - the block the list belongs to
 */
export const usePackedItems = (
  entryId: string,
): { packed: ReadonlySet<string>; togglePacked: (item: string) => void } => {
  const key = storageKeyOf(entryId);
  const stored = useSyncExternalStore(
    subscribe,
    () => globalThis.localStorage.getItem(key),
    readNothing,
  );
  const packed = useMemo(() => parsePacked(stored), [stored]);

  const togglePacked = useCallback(
    (item: string): void => {
      const next = new Set(parsePacked(globalThis.localStorage.getItem(key)));
      if (next.has(item)) next.delete(item);
      else next.add(item);
      if (next.size === 0) globalThis.localStorage.removeItem(key);
      else globalThis.localStorage.setItem(key, JSON.stringify([...next]));
      // the storage event only reaches other tabs
      for (const listener of listeners) listener();
    },
    [key],
  );

  return { packed, togglePacked };
};
