'use client';

import { deploymentId } from '@/config/deployment-id';
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
 * The URL a navigation leads to, if it leads to another page. A change of the query or the hash
 * stays on the page: views keep their steps there, like the naming step of a new group or the
 * block opened in the programme, with state that only lives in React.
 */
const otherPage = (url: string | URL): URL | undefined => {
  const target = new URL(url, globalThis.location.href);
  const current = globalThis.location;
  if (target.origin !== current.origin || target.pathname === current.pathname) return undefined;
  return target;
};

/** Whether a history entry is one the router writes for its navigations, not one a view writes. */
const isRouterEntry = (data: unknown): boolean =>
  typeof data === 'object' && data !== null && (data as { __NA?: unknown }).__NA === true;

/** The link a click opens in this tab, the way the router itself would take it. */
const linkOpenedHere = (event: MouseEvent): HTMLAnchorElement | undefined => {
  if (event.defaultPrevented || event.button !== 0) return undefined;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return undefined;
  const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
  if (!(link instanceof HTMLAnchorElement) || link.hasAttribute('download')) return undefined;
  if (link.target !== '' && link.target !== '_self') return undefined;
  return link;
};

const loadTappedLinkFully = (event: MouseEvent): void => {
  const link = linkOpenedHere(event);
  const target = link ? otherPage(link.href) : undefined;
  if (target === undefined) return;
  event.preventDefault();
  assignLocation(target.href);
};

/**
 * Makes every navigation of this page to another page a full page load, until the returned
 * function undoes it.
 *
 * A tapped link loads before the router sees the tap: the router would ask the worker for the
 * next page in this page's build, which the worker no longer has once the new build is cached, so
 * without network the tap did nothing. A full page load gets the cached page of the new build.
 * `router.push` ends in `history.pushState` once the router has committed the next page, which is
 * where the remaining navigations load fully; Next.js marks those entries with `__NA`, so a view
 * that writes its own entry keeps it.
 */
export const loadNextPageFully = (): (() => void) => {
  const routerPushState = globalThis.history.pushState.bind(globalThis.history);
  const pushState: History['pushState'] = (data, unused, url) => {
    const target =
      url === undefined || url === null || !isRouterEntry(data) ? undefined : otherPage(url);
    if (target === undefined) {
      routerPushState(data, unused, url);
      return;
    }
    assignLocation(target.href);
  };

  // capture, so the click arrives here before the router's handler on the link
  document.addEventListener('click', loadTappedLinkFully, true);
  globalThis.history.pushState = pushState;
  return (): void => {
    document.removeEventListener('click', loadTappedLinkFully, true);
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
      // the build this bundle was made by; Next.js removes `data-dpl-id` from `<html>` on load
      if (event.data.payload.serverBuild === deploymentId) return;
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
