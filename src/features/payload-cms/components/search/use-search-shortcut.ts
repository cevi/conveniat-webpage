'use client';

import { useEffect } from 'react';

/**
 * Ctrl K, or ⌘ K on a Mac: the key sites use to open their search. Only the exact combination
 * counts: Ctrl Shift K is Firefox's console, and a K typed while an input method composes
 * belongs to the text.
 *
 * Chrome's autofill dispatches a `keydown` without a `key` when the user picks a suggestion in a
 * form field, so the type lies here and `key` has to be checked before it is read.
 */
export const isSearchShortcut = (event: KeyboardEvent): boolean =>
  typeof (event.key as string | undefined) === 'string' &&
  event.key.toLowerCase() === 'k' &&
  (event.ctrlKey || event.metaKey) &&
  !event.altKey &&
  !event.shiftKey &&
  !event.isComposing;

/**
 * Calls `onOpen` when the search shortcut is pressed anywhere on the page. The open dialog closes
 * on the same shortcut itself and stops the event, so this listener never sees it then.
 */
export const useSearchShortcut = (onOpen: () => void): void => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (!isSearchShortcut(event)) return;
      event.preventDefault();
      // a held shortcut repeats; only the first press counts, or the search would flicker
      if (!event.repeat) onOpen();
    };
    globalThis.addEventListener('keydown', handleKeyDown);
    return (): void => globalThis.removeEventListener('keydown', handleKeyDown);
  }, [onOpen]);
};
