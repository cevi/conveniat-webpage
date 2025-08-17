import { StarContext } from '@/context/star-context';
import type { StarContextType } from '@/types/types';
import { useContext } from 'react';

/**
 * A custom hook to consume the star context.
 *
 * @returns An object with a function to check if an item is starred
 * and a function to toggle the star status.
 */
export const useStar = (): StarContextType => {
  const context = useContext(StarContext);
  if (context === undefined) {
    throw new Error('useStar must be used within a StarProvider');
  }
  return context;
};
