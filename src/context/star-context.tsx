'use client';

import { useStarSync } from '@/hooks/use-star-sync';
import { useStoredRows } from '@/hooks/use-stored-rows';
import { isStarredRow } from '@/lib/star-sync';
import { setLocalStar, starsCollection } from '@/lib/tanstack-db';
import type { StarContextType } from '@/types/types';
import React, {
  createContext,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';

const STORAGE_KEY = 'starredItems';

export interface StarProviderProperties {
  children: ReactNode;
}

export const StarContext = createContext<StarContextType | undefined>(undefined);

export const StarProvider: React.FC<StarProviderProperties> = ({ children }) => {
  const isInitializedReference = useRef(false);

  const starItems = useStoredRows(starsCollection);

  // Memoize starredEntries to prevent unnecessary re-renders
  const starredEntries = useMemo(
    () => new Set(starItems.filter((item) => isStarredRow(item)).map((item) => item.id)),
    [starItems],
  );

  // Initialize and migrate from old localStorage format (runs once)
  useEffect(() => {
    if (isInitializedReference.current) return;
    isInitializedReference.current = true;

    // Check if we need to migrate from old format
    const currentItems = [...starsCollection.state.values()];
    if (currentItems.length === 0) {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        try {
          const ids = JSON.parse(stored) as string[];
          for (const id of ids) starsCollection.insert({ id, starredAt: Date.now() });
        } catch (error) {
          console.error('Migration failed', error);
        }
      }
    }
  }, []);

  useStarSync(starItems);

  const toggleStar = useCallback((id: string) => {
    const row = starsCollection.get(id);
    setLocalStar(id, row === undefined || !isStarredRow(row));
  }, []);

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
