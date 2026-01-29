'use client';

import { starsCollection } from '@/lib/tanstack-db';
import { trpc } from '@/trpc/client';
import type { StarContextType } from '@/types/types';
import { useLiveQuery } from '@tanstack/react-db';
import type React from 'react';
import { createContext, type ReactNode, useCallback, useEffect, useMemo, useRef } from 'react';

const STORAGE_KEY = 'starredItems';

export interface StarProviderProperties {
  children: ReactNode;
}

export const StarContext = createContext<StarContextType | undefined>(undefined);

export const StarProvider: React.FC<StarProviderProperties> = ({ children }) => {
  const syncTimerReference = useRef<NodeJS.Timeout | null>(null);
  const lastSyncedIdsReference = useRef<string>('');
  const isInitializedReference = useRef(false);

  // Use TanStack DB's useLiveQuery for reactive data
  const { data: starItems } = useLiveQuery((q) => q.from({ star: starsCollection }), []);

  // Memoize starredEntries to prevent unnecessary re-renders
  const starredEntries = useMemo(() => new Set(starItems.map((item) => item.id)), [starItems]);

  // tRPC hooks
  const toggleStarMutation = trpc.schedule.star.toggleStar.useMutation();
  const syncStarsMutation = trpc.schedule.star.syncStars.useMutation();

  // Initialize and migrate from old localStorage format (runs once)
  useEffect(() => {
    if (isInitializedReference.current) return;
    isInitializedReference.current = true;

    // Check if we need to migrate from old format
    const currentItems = [...starsCollection.state.values()];
    if (currentItems.length === 0) {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const ids = JSON.parse(stored) as string[];
          for (const id of ids) starsCollection.insert({ id, starredAt: Date.now() });
        } catch (error) {
          console.error('Migration failed', error);
        }
      }
    }
  }, []);

  // Sync with backend (debounced)
  useEffect(() => {
    if (!isInitializedReference.current || typeof navigator === 'undefined' || !navigator.onLine)
      return;

    const currentIds = [...starredEntries].sort().join(',');

    // Skip if nothing has changed since last sync
    if (currentIds === lastSyncedIdsReference.current) return;

    if (syncTimerReference.current) clearTimeout(syncTimerReference.current);

    syncTimerReference.current = setTimeout(() => {
      const idsArray = currentIds ? currentIds.split(',') : [];
      lastSyncedIdsReference.current = currentIds;

      syncStarsMutation.mutate(
        { courseIds: idsArray },
        {
          onSuccess: (remoteIds): void => {
            const remoteSet = new Set(remoteIds);
            const currentItems = [...starsCollection.state.values()];
            const currentSet = new Set(currentItems.map((index) => index.id));

            const needsUpdate =
              remoteIds.length !== currentItems.length ||
              remoteIds.some((id) => !currentSet.has(id)) ||
              currentItems.some((index) => !remoteSet.has(index.id));

            if (needsUpdate) {
              for (const item of currentItems) {
                if (!remoteSet.has(item.id)) starsCollection.delete(item.id);
              }
              for (const id of remoteIds) {
                if (!currentSet.has(id)) {
                  starsCollection.insert({ id, starredAt: Date.now() });
                }
              }
            }
          },
          onError: (error): void => {
            // Reset lastSyncedIds so we retry on next change
            lastSyncedIdsReference.current = '';
            if (error.data?.code !== 'UNAUTHORIZED' && error.data?.code !== 'FORBIDDEN') {
              console.error('Star sync failed', error);
            }
          },
        },
      );
    }, 2000);

    return (): void => {
      if (syncTimerReference.current) clearTimeout(syncTimerReference.current);
    };
  }, [starredEntries, syncStarsMutation]);

  const toggleStar = useCallback(
    (id: string) => {
      const exists = starsCollection.get(id);
      if (exists) {
        starsCollection.delete(id);
      } else {
        starsCollection.insert({ id, starredAt: Date.now() });
      }

      if (typeof navigator !== 'undefined' && navigator.onLine) {
        toggleStarMutation.mutate({ courseId: id });
      }
    },
    [toggleStarMutation],
  );

  const isStarred = useCallback((id: string) => starredEntries.has(id), [starredEntries]);

  const contextValue = useMemo(
    () => ({
      isStarred,
      toggleStar,
      starredEntries,
    }),
    [isStarred, toggleStar, starredEntries],
  );

  return <StarContext.Provider value={contextValue}>{children}</StarContext.Provider>;
};
