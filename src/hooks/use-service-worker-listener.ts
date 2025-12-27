'use client';

import { useEffect } from 'react';

/**
 * A custom hook that listens for messages from the service worker.
 * Useful for updating UI/cache when data is synced in the background.
 *
 * @param onMessage Callback function to handle the message event.
 */
export function useServiceWorkerListener(onMessage: (event: MessageEvent) => void): void {
  useEffect((): void | (() => void) => {
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      const sw = navigator.serviceWorker;
      sw.addEventListener('message', onMessage);

      return (): void => {
        sw.removeEventListener('message', onMessage);
      };
    }
    return undefined;
  }, [onMessage]);
}
