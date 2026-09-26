'use client';

import { useEffect } from 'react';

/**
 * Asks the browser to confirm before the page is closed or reloaded while there is something
 * unsaved. A link within the site is not caught; the form marks its unsaved state instead.
 */
export const useWarnBeforeLeaving = (unsaved: boolean): void => {
  useEffect(() => {
    if (!unsaved) return;
    const warn = (event: BeforeUnloadEvent): void => event.preventDefault();
    globalThis.addEventListener('beforeunload', warn);
    return (): void => globalThis.removeEventListener('beforeunload', warn);
  }, [unsaved]);
};
