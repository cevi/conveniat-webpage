'use client';

import { ServiceWorkerMessages } from '@/utils/service-worker-messages';
import React from 'react';

/**
 * Answers the service worker's `GET_CLIENT_URL` round-trip with the page's live
 * URL. The service worker cannot see SPA navigations (`WindowClient.url` is the
 * document's creation URL), so it asks the page for its current URL before
 * deciding whether to suppress a push notification.
 */
export const useServiceWorkerClientUrlResponder = (): void => {
  React.useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

    const respondWithCurrentUrl = (event: MessageEvent): void => {
      const data = event.data as { type?: string } | undefined;
      if (data?.type !== ServiceWorkerMessages.GET_CLIENT_URL) return;
      event.ports[0]?.postMessage({ url: globalThis.location.href });
    };

    navigator.serviceWorker.addEventListener('message', respondWithCurrentUrl);
    return (): void => {
      navigator.serviceWorker.removeEventListener('message', respondWithCurrentUrl);
    };
  }, []);
};
