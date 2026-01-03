import { isPWAStandalone } from '@/utils/standalone-check';
import { useEffect } from 'react';

/**
 * Hook to manage app mode detection and notify the service worker.
 * Specifically handles PWA standalone mode detection.
 */
export const useAppMode = (): void => {
  useEffect(() => {
    const isStandalone = isPWAStandalone();

    if (typeof globalThis !== 'undefined' && isStandalone) {
      // Clear the initial entry cookie as soon as the client-side takes over
      // The Service Worker will handle subsequent requests via headers
      // eslint-disable-next-line unicorn/no-document-cookie
      document.cookie = 'x-app-mode-initial=; Max-Age=0; path=/;';

      if ('serviceWorker' in navigator) {
        const sendAppModeMessage = (): void => {
          navigator.serviceWorker.controller?.postMessage({ type: 'SET_APP_MODE' });
        };

        sendAppModeMessage();
        void navigator.serviceWorker.ready.then((registration) => {
          registration.active?.postMessage({ type: 'SET_APP_MODE' });
        });
      }
    }
  }, []);
};
