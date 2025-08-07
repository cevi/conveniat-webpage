'use client';
import type { StarContextType } from '@/features/schedule/types/types';
import type React from 'react';
import { createContext, type ReactNode, useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'starredScheduleItems';

export interface StarProviderProperties {
  children: ReactNode;
}

// Create the context with a default undefined value
export const StarContext = createContext<StarContextType | undefined>(undefined);

export const StarProvider: React.FC<StarProviderProperties> = ({ children }) => {
  const [starredEntries, setStarredEntries] = useState<Set<string>>(() => {
    // Initialize state from localStorage once during component mounting
    try {
      if (typeof globalThis === 'undefined' || typeof localStorage === 'undefined') {
        // If we're on the server, we can't access localStorage
        return new Set();
      }

      const storedItems = localStorage.getItem(STORAGE_KEY);
      if (storedItems != undefined) {
        return new Set(JSON.parse(storedItems) as string[]);
      }
    } catch (error) {
      console.error('Failed to read starred items from localStorage on init', error);
    }
    return new Set();
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...starredEntries]));
    } catch (error) {
      console.error('Failed to save starred items to localStorage', error);
    }
  }, [starredEntries]);

  const toggleStar = useCallback((id: string) => {
    setStarredEntries((previousStarred) => {
      const newStarred = new Set(previousStarred);
      if (newStarred.has(id)) {
        newStarred.delete(id);
      } else {
        newStarred.add(id);
      }
      return newStarred;
    });
  }, []);

  const isStarred = useCallback((id: string) => starredEntries.has(id), [starredEntries]);

  const contextValue = {
    isStarred,
    toggleStar,
  };

  return <StarContext.Provider value={contextValue}>{children}</StarContext.Provider>;
};
