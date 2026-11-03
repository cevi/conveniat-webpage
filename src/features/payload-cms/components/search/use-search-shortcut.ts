'use client';

import { useEffect } from 'react';

/** Ctrl K, or ⌘ K on a Mac: the key sites use to open their search. */
const isSearchShortcut = (event: KeyboardEvent): boolean =>
  event.key.toLowerCase() === 'k' && (event.ctrlKey || event.metaKey) && !event.altKey;

/** Calls `onOpen` when the search shortcut is pressed anywhere on the page. */
export const useSearchShortcut = (onOpen: () => void): void => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (!isSearchShortcut(event)) return;
      event.preventDefault();
      onOpen();
    };
    globalThis.addEventListener('keydown', handleKeyDown);
    return (): void => globalThis.removeEventListener('keydown', handleKeyDown);
  }, [onOpen]);
};
