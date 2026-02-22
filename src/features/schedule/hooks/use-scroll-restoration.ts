'use client';

import { usePathname } from 'next/navigation';
import { useCallback, useRef } from 'react';

const SCROLL_STORAGE_KEY = 'schedule-scroll-position';
const SCROLL_DATE_KEY = 'schedule-current-date';

interface ScrollState {
  scrollY: number;
  path: string;
  timestamp: number;
}

/**
 * Hook to preserve and restore scroll position for the schedule page.
 * Saves scroll position when navigating away and restores it when returning.
 */
export const useScrollRestoration = (
  containerReference?: React.RefObject<HTMLElement | undefined>,
): {
  saveScrollPosition: () => void;
  restoreScrollPosition: () => void;
} => {
  const pathname = usePathname();
  const isRestoringReference = useRef(false);

  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const saveScrollPosition = useCallback((): void => {
    const scrollY = containerReference?.current?.scrollTop ?? window.scrollY;
    const state: ScrollState = {
      scrollY,
      path: pathname,
      timestamp: Date.now(),
    };
    try {
      sessionStorage.setItem(SCROLL_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // sessionStorage might not be available
    }
  }, [pathname, containerReference]);

  const restoreScrollPosition = useCallback((): void => {
    try {
      const stored = sessionStorage.getItem(SCROLL_STORAGE_KEY);
      if (!stored) return;

      const state: ScrollState = JSON.parse(stored) as ScrollState;

      // Only restore if coming back to the same page within 5 minutes
      const isRecent = Date.now() - state.timestamp < 5 * 60 * 1000;
      const isSchedulePage =
        pathname.includes('/app/schedule') && !pathname.includes('/app/schedule/');

      if (isSchedulePage && isRecent) {
        isRestoringReference.current = true;

        // Use requestAnimationFrame to ensure DOM is ready
        requestAnimationFrame(() => {
          if (containerReference?.current) {
            containerReference.current.scrollTop = state.scrollY;
          } else {
            window.scrollTo(0, state.scrollY);
          }

          // Clear restoration flag after a short delay
          setTimeout(() => {
            isRestoringReference.current = false;
          }, 100);
        });

        // Clear the stored position after restoring
        sessionStorage.removeItem(SCROLL_STORAGE_KEY);
      }
    } catch {
      // sessionStorage might not be available
    }
  }, [pathname, containerReference]);

  return { saveScrollPosition, restoreScrollPosition };
};

/**
 * Hook to save current date selection for the schedule page.
 */
export const useDatePersistence = (): {
  saveCurrentDate: (date: Date) => void;
  getSavedDate: () => Date | undefined;
} => {
  const saveCurrentDate = useCallback((date: Date): void => {
    try {
      sessionStorage.setItem(SCROLL_DATE_KEY, date.toISOString());
    } catch {
      // sessionStorage might not be available
    }
  }, []);

  const getSavedDate = useCallback((): Date | undefined => {
    try {
      const stored = sessionStorage.getItem(SCROLL_DATE_KEY);
      if (stored) {
        return new Date(stored);
      }
    } catch {
      // sessionStorage might not be available
    }
    return undefined;
  }, []);

  return { saveCurrentDate, getSavedDate };
};
