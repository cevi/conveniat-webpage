'use client';

import { useEffect } from 'react';

/**
 * Reloads the page once the connection comes back.
 *
 * Meant for the offline page only. The service worker serves it under the address of the page
 * the user asked for, so a reload loads that page as soon as it can. The app no longer reloads
 * on every reconnect, because anywhere else that threw away what the user was doing.
 */
export const useReloadWhenOnline = (): void => {
  useEffect(() => {
    const reload = (): void => {
      globalThis.location.reload();
    };
    globalThis.addEventListener('online', reload);
    return (): void => {
      globalThis.removeEventListener('online', reload);
    };
  }, []);
};
