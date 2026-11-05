'use client';

import type { QueueOrder } from '@/features/wristbands/queue';
import { EMPTY_ORDER } from '@/features/wristbands/queue';
import { useCallback, useRef, useState, useSyncExternalStore } from 'react';

const storageKey = (hofId: string): string => `wristbands-skipped:${hofId}`;

const listeners = new Set<() => void>();
const subscribe = (onChange: () => void): (() => void) => {
  listeners.add(onChange);
  return (): void => {
    listeners.delete(onChange);
  };
};

const EMPTY: string[] = [];
/** the parsed list by its stored text, so a snapshot stays the same while nothing changed */
let cached: { raw: string | null; ids: string[] } = { raw: null, ids: EMPTY };

const readSkipped = (hofId: string): string[] => {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(storageKey(hofId));
  } catch {
    return EMPTY;
  }
  if (raw === cached.raw) return cached.ids;
  let ids: string[] = EMPTY;
  try {
    const parsed: unknown = raw === null ? [] : JSON.parse(raw);
    if (Array.isArray(parsed)) ids = parsed.filter((id): id is string => typeof id === 'string');
  } catch {
    ids = EMPTY;
  }
  cached = { raw, ids };
  return ids;
};

const writeSkipped = (hofId: string, ids: string[]): void => {
  try {
    if (ids.length === 0) localStorage.removeItem(storageKey(hofId));
    else localStorage.setItem(storageKey(hofId), JSON.stringify(ids));
  } catch {
    // private mode or a full storage: the skips last as long as the page
  }
  for (const listener of listeners) listener();
};

const noneOnServer = (): string[] => EMPTY;

/**
 * Where the AVP moved people out of the plain order of the queue. The skipped ones are kept on
 * the device per Hof, so a reload or a lost signal does not bring them back to the front; who
 * was put first lasts as long as the page.
 */
export const useQueueOrder = (
  hofId: string,
): [QueueOrder, (change: (order: QueueOrder) => QueueOrder) => void] => {
  const getSnapshot = useCallback((): string[] => readSkipped(hofId), [hofId]);
  const skipped = useSyncExternalStore(subscribe, getSnapshot, noneOnServer);
  const [front, setFront] = useState<string[]>(EMPTY_ORDER.front);
  // an undo runs seconds after the render that offered it: it reads the order as it is by then
  const frontReference = useRef(front);

  const update = useCallback(
    (change: (order: QueueOrder) => QueueOrder): void => {
      const next = change({ front: frontReference.current, skipped: readSkipped(hofId) });
      frontReference.current = next.front;
      setFront(next.front);
      writeSkipped(hofId, next.skipped);
    },
    [hofId],
  );

  return [{ front, skipped }, update];
};
