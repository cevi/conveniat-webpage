import {
  addAppModeClient,
  ensureAppModeInitialized,
  isClientInAppMode,
  persistAppModeClients,
} from '@/features/service-worker/app-mode';
import { CACHE_NAMES, TIMEOUTS } from '@/features/service-worker/constants';
import { normalizeTileUrl } from '@/features/service-worker/offline-support/map-viewer';
import {
  findReplayableSiblingKey,
  getCleanAppPath,
  matchCachedRsc,
  sanitizeRscResponse,
} from '@/features/service-worker/offline-support/rsc-utils';
import { DesignModeTriggers } from '@/utils/design-codes';
import { isDraftMode } from '@/utils/draft-mode';
import { ServiceWorkerMessages } from '@/utils/service-worker-messages';
import { isNativeAppUserAgent } from '@/utils/standalone-check';
import type { Serwist } from 'serwist';

declare const self: ServiceWorkerGlobalScope;

/** URLs already reported in this SW lifecycle to prevent duplicate PostHog events on browser retries. */
const reportedImage404s = new Set<string>();

const logImage404ToPostHog = async (url: string, clientId: string): Promise<void> => {
  if (reportedImage404s.has(url)) return;
  reportedImage404s.add(url);

  console.error(`[SW] Image not found (404): ${url}`);

  try {
    const message = {
      type: ServiceWorkerMessages.CAPTURE_POSTHOG_EVENT,
      payload: {
        event: 'image_load_error',
        properties: {
          $exception_message: `Image not found: ${url}`,
          error: 'Image 404 Not Found',
          url,
        },
      },
    };

    // Try the specific client first; fall back to broadcasting to all clients
    // (matches the pattern used by logToPostHog in sw.ts)
    const client = clientId === '' ? undefined : await self.clients.get(clientId);
    if (client) {
      client.postMessage(message);
    } else {
      const clients = await self.clients.matchAll();
      for (const c of clients) {
        c.postMessage(message);
      }
    }
  } catch (error) {
    console.debug('[SW] Failed to report image 404 to PostHog', error);
  }
};

async function matchCachedPage(originalUrl: string): Promise<Response | undefined> {
  const pagesCache = await caches.open(CACHE_NAMES.PAGES);
  const urlObject = new URL(originalUrl);
  const cleanPath = getCleanAppPath(urlObject.pathname);

  // 1. Exact Match
  let match = await pagesCache.match(originalUrl, { ignoreVary: true, ignoreSearch: true });
  if (match) return match;

  // 2. Clean Path Match
  const cleanUrl = `${urlObject.origin}${cleanPath}`;
  match = await pagesCache.match(cleanUrl, { ignoreVary: true, ignoreSearch: true });
  if (match) return match;

  // 3. Match across any keys in pagesCache by clean app path
  const keys = await pagesCache.keys();
  const matchingKey = keys.find((keyRequest) => {
    const keyPath = getCleanAppPath(new URL(keyRequest.url).pathname);
    return keyPath === cleanPath;
  });

  if (matchingKey) {
    match = await pagesCache.match(matchingKey, { ignoreVary: true, ignoreSearch: true });
    if (match) return match;
  }

  // 4. REPLAYABLE DYNAMIC ROUTE SHELL (e.g. /app/chat/<a>/details -> /app/chat/<b>/details).
  // Runs before the chat fallback, which would otherwise serve the chat overview document.
  const siblingKey = findReplayableSiblingKey(keys, cleanPath);
  if (siblingKey) {
    match = await pagesCache.match(siblingKey, { ignoreVary: true, ignoreSearch: true });
    if (match) return match;
  }

  // 5. CHAT FALLBACK
  if (cleanPath.startsWith('/app/chat')) {
    const chatKey = keys.find(
      (keyRequest) => getCleanAppPath(new URL(keyRequest.url).pathname) === '/app/chat',
    );
    if (chatKey) {
      match = await pagesCache.match(chatKey, { ignoreVary: true, ignoreSearch: true });
      if (match) return match;
    }
  }

  // 6. SCHEDULE FALLBACK
  if (cleanPath.startsWith('/app/schedule')) {
    const schedKey = keys.find(
      (keyRequest) => getCleanAppPath(new URL(keyRequest.url).pathname) === '/app/schedule',
    );
    if (schedKey) {
      match = await pagesCache.match(schedKey, { ignoreVary: true, ignoreSearch: true });
      if (match) return match;
    }
  }

  // 7. HELPER PORTAL FALLBACK
  if (cleanPath.startsWith('/app/helper-portal')) {
    const helperKey = keys.find(
      (keyRequest) => getCleanAppPath(new URL(keyRequest.url).pathname) === '/app/helper-portal',
    );
    if (helperKey) {
      match = await pagesCache.match(helperKey, { ignoreVary: true, ignoreSearch: true });
      if (match) return match;
    }
  }

  // 8. EMERGENCY FALLBACK
  if (cleanPath.startsWith('/app/emergency')) {
    const emergencyKey = keys.find(
      (keyRequest) => getCleanAppPath(new URL(keyRequest.url).pathname) === '/app/emergency',
    );
    if (emergencyKey) {
      match = await pagesCache.match(emergencyKey, { ignoreVary: true, ignoreSearch: true });
      if (match) return match;
    }
  }

  // 9. MAP FALLBACK
  if (cleanPath.startsWith('/app/map')) {
    const mapKey = keys.find(
      (keyRequest) => getCleanAppPath(new URL(keyRequest.url).pathname) === '/app/map',
    );
    if (mapKey) {
      match = await pagesCache.match(mapKey, { ignoreVary: true, ignoreSearch: true });
      if (match) return match;
    }
  }

  // No fallback to another section's page: answering /app/material with the dashboard showed
  // the dashboard under the material URL, with the tab bar pointing at a page that was not
  // there. The caller answers with the offline page instead, which says what is going on.
  return undefined;
}

/**
 * The cached answer to a page request, or undefined when there is none.
 *
 * A deep link to a schedule entry gets a redirect to `/app/schedule?id=…` instead of the cached
 * schedule shell: served under the `[[...id]]` address, the shell's RSC tree does not match the
 * route, and the router falls over (the offline schedule deep-link hotfix).
 */
async function cachedDocumentFor(url: URL): Promise<Response | undefined> {
  const cleanPath = getCleanAppPath(url.pathname);
  if (cleanPath.startsWith('/app/schedule/') && cleanPath !== '/app/schedule/') {
    const id = cleanPath.replace('/app/schedule/', '');
    return new Response(
      `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0; url=/app/schedule?id=${id}"></head><body>Redirecting...</body></html>`,
      {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      },
    );
  }
  return matchCachedPage(url.toString());
}

/**
 * Whether an RSC request asks for the page its client was showing when it sent the request, like
 * a `router.replace` that only changes the query or a `router.refresh`.
 *
 * The referrer is fixed when the page calls `fetch()`. The client's current URL is not: on a
 * navigation the router commits the new URL while this request is still on its way, so reading
 * it here can mistake a navigation to another page for a same-page update.
 */
async function isRequestForCurrentPage(
  request: Request,
  clientId: string,
  url: URL,
): Promise<boolean> {
  let pageUrl = request.referrer;
  if (pageUrl === '' || pageUrl === 'about:client') {
    if (clientId === '') return false;
    const client = await self.clients.get(clientId);
    if (client === undefined) return false;
    pageUrl = client.url;
  }
  return getCleanAppPath(new URL(pageUrl).pathname) === getCleanAppPath(url.pathname);
}

async function offlineFallback(
  request: Request,
  url: URL,
  isAppMode: boolean,
  clientId = '',
): Promise<Response> {
  // PostHog Analytics: Fail silently (no cache lookup, no error logs)
  if (url.pathname.startsWith('/ingest/')) {
    return Response.error();
  }

  const isRsc =
    url.searchParams.has('_rsc') ||
    request.headers.has('RSC') ||
    request.headers.has('Next-Router-Prefetch');

  const isServerAction = request.headers.has('Next-Action');

  // Strategy A: Server Actions
  // Server Actions fail with native Response.error() so React Flight client handles errors cleanly via Error Boundary
  if (isServerAction) {
    console.warn(`[SW] Server Action offline fallback for: ${url.pathname}`);
    return Response.error();
  }

  // Strategy D: RSC Stream (Flight Payload) Fallback
  if (isRsc) {
    const cachedRsc = await matchCachedRsc(url.toString());
    if (cachedRsc) return cachedRsc;

    // A request for the page already on screen stays a network error. With
    // `experimental.useOffline` the router then keeps the page as it is and retries once the
    // connection returns, which is right for a query update or a refresh. Loading the page as
    // a document instead would only reload what the user is looking at.
    if (await isRequestForCurrentPage(request, clientId, url)) {
      console.warn(`[SW] RSC Cache Miss for the current page: ${url.toString()}.`);
      return Response.error();
    }

    console.warn(`[SW] RSC Cache Miss for: ${url.toString()}. Answering 503.`);

    // Navigating to another page: an empty 503, not a network error and not a redirect.
    //
    // A redirect answers a request carrying `RSC: 1` with HTML, which the Flight client cannot
    // parse; the router then treats the prefetch as unresolved and re-issues it, so a single
    // cache miss turns into a retry loop.
    //
    // A network error is worse here: the router takes it as "offline", parks the navigation
    // until the connection returns and never falls back, so tapping a page that is not cached
    // left the app on its loading state.
    //
    // A non-OK response is what the router treats as "load this page the classic way": the
    // navigation turns into a document request, which this worker answers from the page cache
    // or with the offline page, and a prefetch is rejected with a ten-second backoff.
    // An empty body rather than none: the router reads `res.body` and treats a missing one as
    // a failed fetch, which would park the navigation again.
    return new Response('', { status: 503, statusText: 'Offline' });
  }

  // Strategy D: Map Tiles (Cross-Origin, Load-Balanced)
  // vectortiles0-4 are interchangeable, but precache uses vectortiles0.
  // Before the App Mode check below: MapLibre fetches its tiles from a web worker, whose client
  // is never in App Mode, and a tile looks the same in either design anyway.
  if (url.host.includes('geo.admin.ch')) {
    const tileCache = await caches.open(CACHE_NAMES.MAP_TILES);
    const normalizedUrl = normalizeTileUrl(url.toString());
    const cachedTile = await tileCache.match(normalizedUrl, { ignoreVary: true });
    if (cachedTile) {
      console.log(`[SW] Serving cached map tile/asset for: ${url.toString()}`);
      return cachedTile;
    }
  }

  const isManifestOrIcon =
    url.pathname.endsWith('.webmanifest') ||
    url.pathname.endsWith('manifest.json') ||
    url.pathname.endsWith('.ico') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg');

  const isNextStaticAsset = url.pathname.startsWith('/_next/static/');

  if (!isAppMode && request.destination !== 'document' && !isManifestOrIcon && !isNextStaticAsset) {
    console.log(`[SW] Offline fallback skipped for non-document web request: ${url.pathname}`);
    return Response.error();
  }

  // Strategy B: Cached HTML Page
  if (request.destination === 'document') {
    const cachedPage = await cachedDocumentFor(url);
    if (cachedPage) return cachedPage;

    // Generic Offline Page (final fallback for documents)
    const offlineUrl = isAppMode ? '/~offline?app-mode=true' : '/~offline';

    // Try multiple cache lookup strategies for the offline page with ignoreSearch and ignoreVary
    const pagesCache = await caches.open(CACHE_NAMES.PAGES);
    const offlineFromPages =
      (await pagesCache.match(offlineUrl, { ignoreVary: true, ignoreSearch: true })) ??
      (await pagesCache.match('/~offline', { ignoreVary: true, ignoreSearch: true }));
    if (offlineFromPages) return offlineFromPages;

    const offlinePage =
      (await caches.match(offlineUrl, { ignoreVary: true, ignoreSearch: true })) ??
      (await caches.match('/~offline', { ignoreVary: true, ignoreSearch: true }));
    if (offlinePage) return offlinePage;

    console.warn(`[SW] Returning inline HTML offline fallback for document: ${url.toString()}`);
    return new Response(
      `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline | conveniat</title><style>body{font-family:system-ui,-apple-system,sans-serif;background:#090d16;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center;padding:16px}h1{font-size:24px;margin-bottom:8px}p{color:#9ca3af;margin-bottom:24px}button{background:#2563eb;color:#fff;border:none;padding:12px 24px;border-radius:8px;font-weight:600;cursor:pointer}</style></head><body><div><h1>Du bist offline</h1><p>Diese Seite ist offline noch nicht verfügbar.</p><button onclick="window.location.reload()">Erneut versuchen</button></div><script>addEventListener('online',function(){location.reload()})</script></body></html>`,
      {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      },
    );
  }

  // Strategy C: Manifest & Assets (Non-Document Only)
  const isManifest =
    url.pathname.endsWith('.webmanifest') ||
    url.pathname.endsWith('manifest.json') ||
    url.pathname.endsWith('manifest.webmanifest');

  if (isManifest) {
    const cachedManifest =
      (await caches.match(request, { ignoreSearch: true, ignoreVary: true })) ??
      (await caches.match('/manifest.webmanifest', { ignoreSearch: true, ignoreVary: true }));
    if (cachedManifest) return cachedManifest;

    return new Response(
      JSON.stringify({
        name: 'conveniat',
        short_name: 'conveniat',
        start_url: '/app/dashboard',
        display: 'standalone',
        background_color: '#090d16',
        theme_color: '#090d16',
        icons: [],
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/manifest+json; charset=utf-8' },
      },
    );
  }

  const isJs =
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.mjs') ||
    request.destination === 'script';
  const isCss = url.pathname.endsWith('.css') || request.destination === 'style';
  const isNextImage = url.pathname.startsWith('/_next/image');

  const jsCache = await caches.open(CACHE_NAMES.JS);
  const cssCache = await caches.open(CACHE_NAMES.CSS);
  const assetsCache = await caches.open(CACHE_NAMES.OFFLINE_ASSETS);

  const assetMatch =
    (await caches.match(request, { ignoreSearch: !isNextImage, ignoreVary: true })) ??
    (await jsCache.match(request, {
      ignoreSearch: true,
      ignoreVary: true,
    })) ??
    (await cssCache.match(request, {
      ignoreSearch: true,
      ignoreVary: true,
    })) ??
    (await assetsCache.match(request, {
      ignoreSearch: true,
      ignoreVary: true,
    }));

  if (assetMatch) {
    const contentType = assetMatch.headers.get('content-type') ?? '';
    if ((isJs || isCss) && contentType.includes('text/html')) {
      console.error(`[SW] Blocked HTML asset fallback for asset: ${url.toString()}`);
      return Response.error();
    }
    console.log(`[SW] Serving fallback for: ${url.toString()}`);
    return assetMatch;
  }

  if (isJs) {
    console.warn(
      `[SW] JS script asset unavailable offline, serving safe fallback for: ${url.toString()}`,
    );
    return new Response('/* offline chunk fallback */', {
      status: 200,
      headers: { 'Content-Type': 'application/javascript; charset=utf-8' },
    });
  }

  if (isCss) {
    console.warn(
      `[SW] CSS stylesheet asset unavailable offline, serving safe fallback for: ${url.toString()}`,
    );
    return new Response('/* offline css fallback */', {
      status: 200,
      headers: { 'Content-Type': 'text/css; charset=utf-8' },
    });
  }

  console.error(`[SW] Fetch failed and no cache/fallback found for: ${url.toString()}`);
  return Response.error();
}

/** How long an App Mode page or RSC request may take before the cached copy is shown. */
const APP_MODE_NETWORK_TIMEOUT_MS = 3000;

/**
 * How long a request without a cached copy waits for a slow network before the offline page
 * answers. Wifi that is up but has no working uplink leaves a request open until the browser's
 * own timeout, which can be minutes.
 */
const APP_MODE_NETWORK_GIVE_UP_MS = 15_000;

const noop = (): void => {};

/**
 * Stores an App Mode page or RSC payload for offline use. RSC payloads are buffered and stored
 * without `Vary`, so later lookups match regardless of the request headers.
 */
async function storeAppModeResponse(response: Response, url: URL, isRsc: boolean): Promise<void> {
  try {
    const cache = await caches.open(isRsc ? CACHE_NAMES.RSC : CACHE_NAMES.PAGES);
    if (!isRsc) {
      await cache.put(url.toString(), response);
      return;
    }
    const buffer = await response.arrayBuffer();
    const cleanHeaders = new Headers(response.headers);
    cleanHeaders.delete('Vary');
    await cache.put(
      url.toString(),
      new Response(buffer, {
        status: response.status,
        statusText: response.statusText,
        headers: cleanHeaders,
      }),
    );
  } catch (error) {
    console.warn('[SW] App Mode cache write failed:', error);
  }
}

async function router(event: FetchEvent, serwist: Serwist): Promise<Response> {
  const url = new URL(event.request.url);
  const isNavigation = event.request.mode === 'navigate';
  const isRsc =
    url.searchParams.has('_rsc') ||
    event.request.headers.has('RSC') ||
    event.request.headers.has('Next-Router-Prefetch');
  const isDocument = event.request.destination === 'document';

  let requestToHandle = event.request;

  // 1. App Mode Logic
  // We must ensure the App Mode is initialized for ALL requests when the SW wakes up,
  // otherwise subresource requests (like CSS chunks during client-side navigation)
  // will incorrectly evaluate isAppModeClient as false and be blocked from offline fallback.
  await ensureAppModeInitialized();

  const isAppModeClient =
    (event.clientId !== '' && isClientInAppMode(event.clientId)) ||
    (event.resultingClientId !== '' && isClientInAppMode(event.resultingClientId));

  // Detect native app WebView via User-Agent (same predicate as design-rewrite-proxy.ts).
  // This is the most reliable signal: the WebView ALWAYS sends its brand marker in the UA,
  // regardless of SW state, client ID tracking, or query params.
  const userAgent = event.request.headers.get('user-agent') ?? '';
  const isNativeAppWebView = isNativeAppUserAgent(userAgent);

  // Synchronously register resultingClientId during navigation if in App Mode
  if (isNavigation) {
    const hasAppModeParameter = url.searchParams.get('app-mode') === 'true';
    if (
      (hasAppModeParameter || isNativeAppWebView || isAppModeClient) &&
      event.resultingClientId !== ''
    ) {
      addAppModeClient(event.resultingClientId);
    }

    event.waitUntil(
      (async (): Promise<void> => {
        const hasAppModeParameter_ = url.searchParams.get('app-mode') === 'true';
        if (
          (hasAppModeParameter_ ||
            isNativeAppWebView ||
            (event.clientId !== '' && isClientInAppMode(event.clientId))) &&
          event.resultingClientId !== ''
        ) {
          addAppModeClient(event.resultingClientId);
          await persistAppModeClients();
        }
      })(),
    );
  }

  // 2. Targeted Injection (Header Strategy)
  // App Mode travels as a header, never as a query param. Only documents and RSC requests
  // get it: API requests never reach the router, handleFetchEvent leaves them to the browser.
  const hasAppModeParameter = url.searchParams.get('app-mode') === 'true';
  const isAppMode = hasAppModeParameter || isAppModeClient || isNativeAppWebView;

  if (url.origin === self.location.origin && isAppMode) {
    console.log(`[SW] App Mode Detected for ${url.pathname}. Injecting Header.`);

    if (isDocument || isRsc) {
      requestToHandle = new Request(event.request, {
        headers: {
          ...Object.fromEntries(event.request.headers),
          [DesignModeTriggers.HEADER_IMPLICIT]: 'true',
        },
      });
    }
  }
  if (url.origin !== self.location.origin) {
    // Cross-Origin (e.g. Map Tiles) - No Injection
    // console.log(`[SW] Cross-Origin request: ${url.origin}`);
  }

  try {
    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

    // Fast-path offline fallback for documents and RSC requests when network is off
    if (isOffline) {
      console.log(`[SW] Fast Offline Fallback for ${url.pathname}`);
      return offlineFallback(event.request, url, isAppMode, event.clientId);
    }

    // If we are in App Mode and requesting a Document or RSC payload, bypass Serwist's
    // automatic precache which might contain Web Mode versions. Do a manual network-first fetch.
    //
    // Camp wifi is often slow rather than down. When the network has not answered after
    // APP_MODE_NETWORK_TIMEOUT_MS, the cached copy is served, but the request keeps running and
    // refreshes the cache when it lands; aborting it meant a slow network never refreshed
    // anything. Without a cached copy there is nothing better to show, so the worker keeps
    // waiting for the network, up to APP_MODE_NETWORK_GIVE_UP_MS, instead of giving up on a page
    // that would have arrived.
    if (isAppMode && (isDocument || isRsc)) {
      // Only navigation payloads are cached. Offline, `matchCachedRsc` answers a navigation
      // with any entry for the same path, and a prefetch response there (a route tree or a
      // single segment) is one the router cannot use, so it reloaded the whole page.
      const isPrefetch = event.request.headers.has('Next-Router-Prefetch');

      const fromNetwork = fetch(requestToHandle).then((networkResponse) => {
        if (networkResponse.ok && !isPrefetch) {
          event.waitUntil(storeAppModeResponse(networkResponse.clone(), url, isRsc));
        }
        return networkResponse;
      });

      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      const slowNetwork = new Promise<'slow'>((resolve) => {
        timeoutId = setTimeout(() => resolve('slow'), APP_MODE_NETWORK_TIMEOUT_MS);
      });

      try {
        const first = await Promise.race([fromNetwork, slowNetwork]);
        clearTimeout(timeoutId);
        if (first !== 'slow') return isRsc ? sanitizeRscResponse(first) : first;

        // A prefetch blocks nobody, so it waits for the network rather than getting a cached
        // navigation payload in a shape it does not expect.
        let cached: Response | undefined;
        if (!isPrefetch) {
          cached = isRsc ? await matchCachedRsc(url.toString()) : await cachedDocumentFor(url);
        }
        if (cached) {
          console.log(`[SW] Slow network for ${url.pathname}, serving the cached copy meanwhile`);
          event.waitUntil(fromNetwork.then(noop, noop));
          return cached;
        }

        const givingUp = new Promise<'give-up'>((resolve) => {
          timeoutId = setTimeout(
            () => resolve('give-up'),
            APP_MODE_NETWORK_GIVE_UP_MS - APP_MODE_NETWORK_TIMEOUT_MS,
          );
        });
        const late = await Promise.race([fromNetwork, givingUp]);
        clearTimeout(timeoutId);
        if (late === 'give-up') {
          console.warn(`[SW] No answer for ${url.pathname}, answering with the offline fallback`);
          event.waitUntil(fromNetwork.then(noop, noop));
          return offlineFallback(event.request, url, isAppMode, event.clientId);
        }
        return isRsc ? sanitizeRscResponse(late) : late;
      } catch (error) {
        clearTimeout(timeoutId);
        console.warn(
          `[SW] App Mode fetch failed for ${url.pathname}, bailing to offline fallback`,
          error,
        );
        return offlineFallback(event.request, url, isAppMode, event.clientId);
      }
    }

    // 3. Serwist Strategies
    const response = await serwist.handleRequest({
      request: requestToHandle,
      event,
    });

    if (response) {
      if (!response.ok && response.status === 504) {
        console.warn(`[SW] Serwist returned 504 for ${url.pathname}, bailing to offline fallback`);
        return offlineFallback(event.request, url, isAppMode, event.clientId);
      }

      if (isRsc) {
        return sanitizeRscResponse(response);
      }

      if (response.status === 404 && requestToHandle.destination === 'image') {
        event.waitUntil(logImage404ToPostHog(requestToHandle.url, event.clientId));
      }

      return response;
    }

    const networkResponse = await fetch(requestToHandle);

    const isJsAsset = url.pathname.endsWith('.js') || url.pathname.endsWith('.mjs');
    const isCssAsset = url.pathname.endsWith('.css') || requestToHandle.destination === 'style';
    const contentType = networkResponse.headers.get('content-type') ?? '';

    // Prevent Next.js 404/5xx HTML pages from being parsed as scripts or stylesheets
    if (!networkResponse.ok && (isJsAsset || isCssAsset) && contentType.includes('text/html')) {
      console.error(
        `[SW] Blocked HTML response for asset fetch: ${requestToHandle.url} (Status: ${networkResponse.status})`,
      );
      return Response.error(); // Trigger Next.js chunk-load error handling cleanly
    }

    if (networkResponse.status === 404 && requestToHandle.destination === 'image') {
      event.waitUntil(logImage404ToPostHog(requestToHandle.url, event.clientId));
    }

    return networkResponse;
  } catch (error) {
    if (error instanceof Error) {
      console.debug(`[SW] Network/MW failed for ${url.pathname}`, error);
    }
    return offlineFallback(event.request, url, isAppMode, event.clientId);
  }
}

/**
 * Counts how often the cached session was thrown away. A session request may now outlive the
 * answer it gave (see the session check below); when it lands after a logout, writing it would
 * sign the previous user back in on this phone as far as the offline UI is concerned.
 */
let sessionGeneration = 0;

/** Drops the cached session, and any session answer still on its way in. */
export async function forgetCachedSession(): Promise<void> {
  sessionGeneration++;
  await caches.delete(CACHE_NAMES.AUTH_SESSION);
}

/** Keeps the session of a logged-in user for offline use and forgets it on a logout. */
async function rememberSession(
  request: Request,
  networkResponse: Response,
  generation: number,
): Promise<void> {
  if (generation !== sessionGeneration) return;
  if (networkResponse.ok) {
    try {
      const sessionData = (await networkResponse.clone().json()) as { user?: unknown };
      if (generation !== sessionGeneration) return;
      if (sessionData.user !== undefined && sessionData.user !== null) {
        const authCache = await caches.open(CACHE_NAMES.AUTH_SESSION);
        await authCache.put(request, networkResponse.clone());
      } else {
        await caches.delete(CACHE_NAMES.AUTH_SESSION);
      }
    } catch {
      await caches.delete(CACHE_NAMES.AUTH_SESSION);
    }
  } else if (networkResponse.status === 401 || networkResponse.status === 403) {
    await caches.delete(CACHE_NAMES.AUTH_SESSION);
  }
}

/**
 * The cached session of the user logged in on this device, with its expiry moved 30 days ahead
 * so the next-auth client does not log them out while offline. Undefined when nobody is.
 */
async function cachedSessionFor(request: Request): Promise<Response | undefined> {
  const authCache = await caches.open(CACHE_NAMES.AUTH_SESSION);
  const cachedSession =
    (await authCache.match(request, { ignoreSearch: true, ignoreVary: true })) ??
    (await authCache.match('/api/auth/session', { ignoreSearch: true, ignoreVary: true })) ??
    (await caches.match('/api/auth/session', { ignoreSearch: true, ignoreVary: true }));
  if (!cachedSession) return undefined;

  try {
    const sessionData = (await cachedSession.clone().json()) as {
      expires?: string;
      user?: unknown;
      [key: string]: unknown;
    };
    if (sessionData.user === undefined || sessionData.user === null) return undefined;
    sessionData.expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    return new Response(JSON.stringify(sessionData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return cachedSession;
  }
}

export const handleFetchEvent =
  (serwist: Serwist): ((event: FetchEvent) => void) =>
  (event: FetchEvent): void => {
    const url = new URL(event.request.url);

    const isPreviewRequest =
      isDraftMode(event.request.headers.get('cookie')) ||
      url.searchParams.get('preview') === 'true';

    // Match on the path Next.js routes: it answers `//api/users` with a 308 to `/api/users`,
    // so the raw path would slip past the API bypass and into the runtime caches.
    const routedPath = url.pathname.replaceAll(/\/{2,}/g, '/');
    const isAdminPanel = routedPath.startsWith('/admin');
    const isAuthRequest = routedPath.startsWith('/api/auth/');
    const isIngestRequest = routedPath.startsWith('/ingest');
    const isTrpcRequest = routedPath.startsWith('/api/trpc/');
    // Auth and tRPC are the only API routes with an offline answer below. For every other
    // one the worker could only forward the network response, and forwarding a stream is
    // harmful: Firefox terminates a worker 30 s after its last event and cuts the body it is
    // still relaying, which surfaced as "Error in input stream" on the NDJSON admin endpoints
    // and drops the chat EventSource every 30 s.
    const isApiWithoutOfflineStrategy =
      routedPath.startsWith('/api/') && !isAuthRequest && !isTrpcRequest;

    // avoid the service worker for admin panel, ingest and plain API requests
    if (isAdminPanel || isIngestRequest || isApiWithoutOfflineStrategy) {
      return;
    }

    // The only HEAD request the app sends is the Next.js router asking whether the network is
    // back (`experimental.useOffline`). A cached answer tells it yes while the device is still
    // offline, so it retries the failed navigation or prefetch at once, fails, and asks again
    // in a tight loop. It has to reach the network, and its empty body must never be stored as
    // the page's RSC payload.
    if (event.request.method === 'HEAD') {
      return;
    }

    if (
      isAuthRequest &&
      (url.pathname.includes('/auth/signout') || url.pathname.includes('/auth/signin'))
    ) {
      event.waitUntil(forgetCachedSession());
    }

    if (isAuthRequest && url.pathname.endsWith('/session')) {
      event.respondWith(
        (async (): Promise<Response> => {
          // A hanging connection (a captive portal, a weak camp wifi) kept this request open
          // until the entrypoint gave up and showed the login screen to a logged-in user, on a
          // network where the Cevi.DB login cannot complete either. After SESSION_FETCH the
          // cached session answers instead, but only for a user who has one, and the request is
          // never aborted: it may carry a rotated session cookie, and its answer refreshes the
          // cache when it lands.
          const generation = sessionGeneration;
          const fromNetwork = fetch(event.request).then(async (networkResponse) => {
            await rememberSession(event.request, networkResponse, generation);
            return networkResponse;
          });

          let timeoutId: ReturnType<typeof setTimeout> | undefined;
          const slowNetwork = new Promise<'slow'>((resolve) => {
            timeoutId = setTimeout(() => resolve('slow'), TIMEOUTS.SESSION_FETCH);
          });

          try {
            const first = await Promise.race([fromNetwork, slowNetwork]);
            clearTimeout(timeoutId);
            if (first !== 'slow') return first;

            const cachedSession = await cachedSessionFor(event.request);
            if (cachedSession) {
              event.waitUntil(fromNetwork.catch(() => {}));
              return cachedSession;
            }
            return await fromNetwork;
          } catch {
            clearTimeout(timeoutId);
            const cachedSession = await cachedSessionFor(event.request);
            if (cachedSession) return cachedSession;

            // No cached session: answer what next-auth answers for nobody, `null`. This used to
            // invent an "Offline User", which showed up by that name in the UI, filled forms
            // with a made-up email address and made a logged-out phone look logged in. A user
            // who was logged in has their real session cached above, so this only reaches
            // devices without one.
            return new Response('null', {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            });
          }
        })(),
      );
      return;
    }

    // Proxy bypass: We still want the SW to intercept these to provide the automatic
    // HTML retry wrapper on connection drops, but we skip cache lookup strategies.
    //
    // `/api/auth/csrf` deliberately takes this path rather than a fallback of its own. It used
    // to answer an unreachable network with a made-up `offline-csrf-token`. That changed
    // nothing: next-auth's `getCsrfToken()` already turns a failed fetch into an empty token,
    // and the server rejects an empty token and a made-up one alike with `MissingCSRF`. It only
    // hid that the request had failed.
    const bypassSWProxy = isPreviewRequest || isAuthRequest || isTrpcRequest;

    if (bypassSWProxy) {
      event.respondWith(
        (async (): Promise<Response> => {
          const controller = isTrpcRequest ? new AbortController() : undefined;
          const timeoutId = controller ? setTimeout(() => controller.abort(), 10_000) : undefined;

          try {
            const response = await fetch(
              controller
                ? new Request(event.request, { signal: controller.signal })
                : event.request,
            );
            if (timeoutId) clearTimeout(timeoutId);
            return response;
          } catch (error) {
            if (timeoutId) clearTimeout(timeoutId);

            const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
            if (isOffline && isTrpcRequest) {
              console.debug(`[SW] bypass fetch failed (expected offline): ${url.href}`);
            } else {
              console.warn(`[SW] bypass fetch failed or timed out: ${url.href}`, error);
            }

            // For tRPC requests, return standard Response.error() so TanStack Query treats it as a
            // network error (offline) and loads from IndexedDB/query cache instead of failing with 503.
            if (isTrpcRequest) {
              return Response.error();
            }

            if (event.request.mode === 'navigate') {
              return new Response(
                '<!DOCTYPE html><html><head><meta http-equiv="refresh" content="2"></head>' +
                  '<body style="font-family:sans-serif;text-align:center;padding-top:100px;background:#f9fafb;color:#6b7280;">' +
                  'Verbindung wird wiederhergestellt</body></html>',
                {
                  status: 503,
                  headers: { 'Content-Type': 'text/html' },
                },
              );
            }

            return Response.error();
          }
        })(),
      );
      return;
    }

    event.respondWith(
      router(event, serwist).catch((criticalError: unknown) => {
        console.error(`[SW] Critical Error while Fetching ${event.request.url}:`, criticalError);
        return offlineFallback(event.request, url, false, event.clientId);
      }),
    );
  };
