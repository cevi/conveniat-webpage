'use client';

import { onlineStatusStore } from '@/hooks/use-online-status';
import { assignLocation } from '@/utils/assign-location';
import { ServiceWorkerMessages } from '@/utils/service-worker-messages';
import { useEffect } from 'react';

const isBuildStatusMessage = (
  data: unknown,
): data is { type: string; payload: { serverBuild: string } } => {
  if (typeof data !== 'object' || data === null) return false;
  const message = data as { type?: unknown; payload?: { serverBuild?: unknown } };
  return (
    message.type === ServiceWorkerMessages.BUILD_STATUS &&
    typeof message.payload?.serverBuild === 'string'
  );
};

/**
 * Makes every navigation of this page that changes its path or query a full page load, until
 * the returned function undoes it.
 *
 * A link tap and `router.push` both end in `history.pushState`, which the router calls once it
 * has committed the next page, so this is the one place that sees them all. Offline the router
 * keeps navigating from its cache; the first navigation once the network answers loads fully.
 */
export const loadNextPageFully = (): (() => void) => {
  const routerPushState = globalThis.history.pushState.bind(globalThis.history);
  const pushState: History['pushState'] = (data, unused, url) => {
    if (url !== undefined && url !== null && onlineStatusStore.getSnapshot()) {
      const target = new URL(url, globalThis.location.href);
      const current = globalThis.location;
      if (target.pathname !== current.pathname || target.search !== current.search) {
        assignLocation(target.href);
        return;
      }
    }
    routerPushState(data, unused, url);
  };
  globalThis.history.pushState = pushState;
  return (): void => {
    if (globalThis.history.pushState === pushState) globalThis.history.pushState = routerPushState;
  };
};

/**
 * Loads the next page from the server once the service worker reports that the server runs
 * another build than this page.
 *
 * After a release, a cold start on slow wifi gets the previous build's page from the worker's
 * cache. Its router still navigates on the client, and on some routes it commits a page it cannot
 * load and never falls back to a full page load, so the app stopped navigating. Reloading as soon
 * as the worker knows would throw away what someone is typing, so the page waits for the next
 * navigation, the moment Next.js itself switches builds.
 */
export const useFullLoadAfterRelease = (): void => {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const serviceWorker = navigator.serviceWorker;
    let restore: (() => void) | undefined;

    const handleMessage = (event: MessageEvent): void => {
      if (!isBuildStatusMessage(event.data) || restore !== undefined) return;
      const pageBuild = document.documentElement.dataset['dplId'];
      if (pageBuild === undefined || pageBuild === event.data.payload.serverBuild) return;
      restore = loadNextPageFully();
    };

    serviceWorker.addEventListener('message', handleMessage);
    // the worker may have learned it before this page listened
    serviceWorker.controller?.postMessage({ type: ServiceWorkerMessages.BUILD_STATUS });
    return (): void => {
      serviceWorker.removeEventListener('message', handleMessage);
      restore?.();
    };
  }, []);
};
