'use client';

import { StarContext } from '@/context/star-context';
import type { StarContextType } from '@/types/types';
import { useContext } from 'react';

const emptySet = new Set<string>();
const dummyContext: StarContextType = {
  isStarred: () => false,
  toggleStar: () => {
    console.warn('StarContext not found: toggleStar is disabled outside of StarProvider');
  },
  starredEntries: emptySet,
};

/**
 * A custom hook to consume the star context.
 *
 * @returns An object with a function to check if an item is starred
 * and a function to toggle the star status.
 */
export const useStar = (): StarContextType => {
  const context = useContext(StarContext);
  return context ?? dummyContext;
};
