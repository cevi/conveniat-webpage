'use client';

import { useEffect } from 'react';

/**
 * How many parts of the dashboard hold something that would be lost right now; shared by all
 * dashboards on the page, which is one in practice.
 */
let unsavedParts = 0;

/** Whether leaving the current Hof would lose unsaved quantities or an upload under way. */
export const hasUnsavedWork = (): boolean => unsavedParts > 0;

/**
 * Asks the browser to confirm before the page is closed or reloaded while something would
 * be lost: unsaved quantities, or an upload under way. The Hof select asks `hasUnsavedWork`
 * the same before it swaps the dashboard; a link within the site is not caught.
 */
export const useWarnBeforeLeaving = (unsaved: boolean): void => {
  useEffect(() => {
    if (!unsaved) return;
    unsavedParts += 1;
    const warn = (event: BeforeUnloadEvent): void => event.preventDefault();
    globalThis.addEventListener('beforeunload', warn);
    return (): void => {
      unsavedParts -= 1;
      globalThis.removeEventListener('beforeunload', warn);
    };
  }, [unsaved]);
};
