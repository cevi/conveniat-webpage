'use client';
import { useAuthStatus } from '@/hooks/use-auth-status';
import { useOnlineStatus } from '@/hooks/use-online-status';
import {
  isPendingRow,
  pendingStarChanges,
  reconcileStars,
  type StarRowWrites,
} from '@/lib/star-sync';
import { starsCollection, type StarRecord } from '@/lib/tanstack-db';
import { useTRPC } from '@/trpc/client';
import { TRPCClientError } from '@trpc/client';
import { useCallback, useEffect, useRef } from 'react';

import { useMutation } from '@tanstack/react-query';

/** How long a change waits for the next one before it is sent, so a double tap is one request. */
const CHANGE_DEBOUNCE_MS = 1000;

const hasPendingRows = (): boolean =>
  [...starsCollection.state.values()].some((row) => isPendingRow(row));

/** The localStorage collection rewrites everything per call, so each kind of write is one call. */
const applyStarWrites = (writes: StarRowWrites): void => {
  if (writes.insert.length > 0) starsCollection.insert(writes.insert);
  if (writes.update.length > 0) {
    const byId = new Map(writes.update.map((row) => [row.id, row]));
    starsCollection.update([...byId.keys()], (drafts) => {
      for (const draft of drafts) {
        const row = byId.get(draft.id);
        if (row === undefined) continue;
        draft.starred = row.starred;
        draft.synced = row.synced;
      }
    });
  }
  if (writes.delete.length > 0) starsCollection.delete(writes.delete);
};

const isSignedOutError = (error: unknown): boolean => {
  if (!(error instanceof TRPCClientError)) return false;
  const code = (error.data as { code?: string } | undefined)?.code;
  return code === 'UNAUTHORIZED' || code === 'FORBIDDEN';
};

/**
 * Keeps the stars of this device and of the database in step, see `@/lib/star-sync`.
 *
 * Syncs once signed in and online, again whenever the app returns to the foreground so stars
 * set on another device show up, and shortly after every change made here. Changes made offline
 * or signed out wait in the collection until one of those happens.
 *
 * @param rows - The stored star rows, live.
 */
export const useStarSync = (rows: StarRecord[]): void => {
  const trpc = useTRPC();
  const status = useAuthStatus();
  const isOnline = useOnlineStatus();
  const canSync = status === 'authenticated' && isOnline;
  const canSyncReference = useRef(canSync);
  const isSyncing = useRef(false);
  /** Counts the calls, so a run can tell whether one came in while its request was out. */
  const requests = useRef(0);
  const { mutateAsync: updateStars } = useMutation(
    trpc.schedule.star.updateStars.mutationOptions(),
  );

  useEffect(() => {
    canSyncReference.current = canSync;
  }, [canSync]);

  // One request at a time: an older answer arriving last would undo a newer one.
  const sync = useCallback(async (): Promise<void> => {
    requests.current += 1;
    if (isSyncing.current) return;
    isSyncing.current = true;
    try {
      // again while changes wait: made meanwhile, or more than one request carries
      do {
        const requestsBefore = requests.current;
        try {
          const stored = await starsCollection.stateWhenReady();
          const { changes, sentAt } = pendingStarChanges([...stored.values()]);
          const remoteIds = await updateStars({ changes });
          applyStarWrites(
            reconcileStars([...starsCollection.state.values()], sentAt, remoteIds, Date.now()),
          );
        } catch (error) {
          // every change stays; the next foreground, reconnect or change retries it
          if (!isSignedOutError(error)) console.warn('Star sync failed:', error);
          if (requests.current === requestsBefore) break;
        }
      } while (canSyncReference.current && hasPendingRows());
    } finally {
      isSyncing.current = false;
    }
  }, [updateStars]);

  // signed in, back online, or a new session
  useEffect(() => {
    if (canSync) void sync();
  }, [canSync, sync]);

  useEffect(() => {
    if (!canSync) return;
    const syncWhenVisible = (): void => {
      if (document.visibilityState === 'visible') void sync();
    };
    document.addEventListener('visibilitychange', syncWhenVisible);
    return (): void => document.removeEventListener('visibilitychange', syncWhenVisible);
  }, [canSync, sync]);

  const pendingKey = rows
    .filter((row) => isPendingRow(row))
    .map((row) => `${row.id}:${String(row.starredAt)}`)
    .join(',');

  useEffect(() => {
    if (!canSync || pendingKey === '') return;
    const timer = setTimeout(() => {
      if (hasPendingRows()) void sync();
    }, CHANGE_DEBOUNCE_MS);
    return (): void => clearTimeout(timer);
  }, [canSync, pendingKey, sync]);
};
