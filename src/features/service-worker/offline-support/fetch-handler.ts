import {
  addAppModeClient,
  ensureAppModeInitialized,
  isClientInAppMode,
  persistAppModeClients,
} from '@/features/service-worker/app-mode';
import { CACHE_NAMES } from '@/features/service-worker/constants';
import { normalizeTileUrl } from '@/features/service-worker/offline-support/map-viewer';
import {
  matchCachedRsc,
  sanitizeRscResponse,
} from '@/features/service-worker/offline-support/rsc-utils';
import { DesignModeTriggers } from '@/utils/design-codes';
import type { Serwist } from 'serwist';

async function matchCachedPage(originalUrl: string): Promise<Response | undefined> {
  const pagesCache = await caches.open(CACHE_NAMES.PAGES);
  const urlObject = new URL(originalUrl);

  // 1. Exact Match
  const exactMatch = await pagesCache.match(originalUrl, { ignoreVary: true });
  if (exactMatch) return exactMatch;

  // 2. Ignore Search Params
  const matchIgnoreSearch = await pagesCache.match(originalUrl, {
    ignoreSearch: true,
    ignoreVary: true,
  });
  if (matchIgnoreSearch) return matchIgnoreSearch;

  // 3. Clean Path Match
  const cleanUrl = `${urlObject.origin}${urlObject.pathname}`;
  const cleanMatch = await pagesCache.match(cleanUrl, { ignoreVary: true });
  if (cleanMatch) return cleanMatch;

  // 4. SCHEDULE FALLBACK (For Hard Reloads)
  if (
    urlObject.pathname.startsWith('/app/schedule/') &&
    !urlObject.pathname.includes('offline-entry')
  ) {
    const offlineEntryUrl = `${urlObject.origin}/app/schedule/offline-entry`;
    const offlineEntry = await pagesCache.match(offlineEntryUrl, { ignoreVary: true });
    if (offlineEntry) return offlineEntry;
  }

  // 5. MAP FALLBACK
  if (urlObject.pathname.startsWith('/app/map')) {
    const cachedMapPage = await pagesCache.match('/app/map', { ignoreVary: true });
    if (cachedMapPage) return cachedMapPage;
  }

  return undefined;
}

async function offlineFallback(request: Request, url: URL, isAppMode: boolean): Promise<Response> {
  // PWA only: Browser users should see the standard browser offline error.
  if (!isAppMode) {
    console.log(`[SW] Offline fallback skipped for browser user: ${url.pathname}`);
    return Response.error();
  }

  // PostHog Analytics: Fail silently (no cache lookup, no error logs)
  if (url.pathname.startsWith('/ingest/')) {
    return Response.error();
  }

  const isRsc = url.searchParams.has('_rsc');

  // Strategy A: Cached RSC
  if (isRsc) {
    const cachedRsc = await matchCachedRsc(url.toString());
    if (cachedRsc) return cachedRsc;
    console.warn(`[SW] RSC Cache Miss for: ${url.toString()}. Returning error response.`);
    return Response.error();
  }

  // Strategy B: Cached HTML Page
  if (request.destination === 'document') {
    const cachedPage = await matchCachedPage(url.toString());
    if (cachedPage) return cachedPage;

    // Generic Offline Page (final fallback for documents)
    // Try multiple cache lookup strategies for /~offline
    const pagesCache = await caches.open(CACHE_NAMES.PAGES);
    const offlineFromPages = await pagesCache.match('/~offline', { ignoreVary: true });
    if (offlineFromPages) return offlineFromPages;

    // Try global cache match (e.g., precache)
    const offlinePage = await caches.match('/~offline', { ignoreVary: true });
    if (offlinePage) return offlinePage;
    console.error(`[SW] No offline fallback found for document: ${url.toString()}`);
    return Response.redirect('/~offline', 302);
  }

  // Strategy C: Assets (Non-Document Only)
  const assetMatch = await caches.match(request, { ignoreSearch: true, ignoreVary: true });
  if (assetMatch) {
    console.log(`[SW] Serving fallback for: ${url.toString()}`);
    return assetMatch;
  }

  // Strategy D: Map Tiles (Cross-Origin, Load-Balanced)
  // vectortiles0-4 are interchangeable, but precache uses vectortiles0.
  if (url.host.includes('geo.admin.ch') && url.pathname.includes('/tiles/')) {
    const tileCache = await caches.open(CACHE_NAMES.MAP_TILES);
    const normalizedUrl = normalizeTileUrl(url.toString());
    const cachedTile = await tileCache.match(normalizedUrl, { ignoreVary: true });
    if (cachedTile) {
      console.log(`[SW] Serving cached map tile for: ${url.toString()}`);
      return cachedTile;
    }
  }

  // Strategy E: API Fallback
  // Return a proper HTTP response instead of Response.error() to prevent app hangs
  if (url.pathname.startsWith('/api/')) {
    console.warn(`[SW] API offline fallback for: ${url.pathname}`);
    return new Response(
      JSON.stringify({
        error: 'offline',
        message: 'You are offline. This request requires an internet connection.',
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  console.error(`[SW] Fetch failed and no cache/fallback found for: ${url.toString()}`);
  return Response.error();
}

async function router(event: FetchEvent, serwist: Serwist): Promise<Response> {
  const url = new URL(event.request.url);
  const isNavigation = event.request.mode === 'navigate';
  const isRsc = url.searchParams.has('_rsc');
  const isApi = url.pathname.startsWith('/api/');
  const isDocument = event.request.destination === 'document';

  if (isApi) {
    return fetch(event.request);
  }

  // 1. App Mode Logic (Optimized)
  // We only block for critical state (Headers) on Documents, API, and RSC.
  // Static assets (images, fonts, scripts) skip this to avoid latency.
  if (isDocument || isRsc) {
    await ensureAppModeInitialized();
  }

  // Fire-and-forget persistence (don't block response)
  if (isNavigation) {
    event.waitUntil(
      (async (): Promise<void> => {
        await ensureAppModeInitialized();
        const hasAppModeParameter = url.searchParams.get('app-mode') === 'true';
        if (
          (hasAppModeParameter || (event.clientId !== '' && isClientInAppMode(event.clientId))) &&
          event.resultingClientId !== ''
        ) {
          addAppModeClient(event.resultingClientId);
          await persistAppModeClients();
        }
      })(),
    );
  }

  let requestToHandle = event.request;

  // 2. Targeted Injection (Header Strategy)
  // User Requirement: Use Header for everything (Documents, API, RSC). Never Query Param.
  const hasAppModeParameter = url.searchParams.get('app-mode') === 'true';
  const isAppModeClient = event.clientId !== '' && isClientInAppMode(event.clientId);
  const isAppMode = hasAppModeParameter || isAppModeClient;

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

  // 3. Proactive Cache Check for Documents (App Mode only)
  let cachedDocumentFallback: Response | undefined;
  if (isDocument && isAppMode) {
    cachedDocumentFallback = await matchCachedPage(url.toString());
  }

  try {
    // 3. Serwist Strategies
    const response = await serwist.handleRequest({
      request: requestToHandle,
      event,
    });

    if (response) {
      if (isRsc) {
        return sanitizeRscResponse(response);
      }

      if (isDocument && isAppMode) {
        const contentType = response.headers.get('content-type') ?? '';
        if (contentType.includes('text/x-component')) {
          console.warn(`[SW] Document request got RSC Content-Type, using cached page.`);
          // Use prepared cache fallback (no async lookup needed)
          if (cachedDocumentFallback) return cachedDocumentFallback;
          const offlinePage = await caches.match('/~offline', { ignoreVary: true });
          if (offlinePage) return offlinePage;
        }
      }

      return response;
    }

    return await fetch(requestToHandle);
  } catch (error) {
    if (error instanceof Error) {
      console.debug(`[SW] Network/MW failed for ${url.pathname}`, error);
    }
    // Only serve offline fallback on true Network Errors (App Mode only)
    return offlineFallback(event.request, url, isAppMode);
  }
}

export const handleFetchEvent =
  (serwist: Serwist): ((event: FetchEvent) => void) =>
  (event: FetchEvent): void => {
    event.respondWith(
      router(event, serwist).catch((criticalError: unknown) => {
        console.error('[SW] Critical Error:', criticalError);
        return new Response('Critical SW Error', { status: 500 });
      }),
    );
  };
