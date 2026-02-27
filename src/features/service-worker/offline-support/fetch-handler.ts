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
import { isDraftMode } from '@/utils/draft-mode';
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
  // Schedule pages are now fully CSR with tRPC cache - the main page works as its own offline shell
  if (urlObject.pathname.startsWith('/app/schedule/')) {
    const scheduleListUrl = `${urlObject.origin}/app/schedule`;
    const schedulePage = await pagesCache.match(scheduleListUrl, { ignoreVary: true });
    if (schedulePage) return schedulePage;
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
    console.warn(`[SW] RSC Cache Miss for: ${url.toString()}. Returning 504 response.`);
    // IMPORTANT: Returning Response.error() causes Next.js App Router to hang indefinitely
    // in the entrypoint loading state. We must return a valid HTTP Error (like 504) so
    // the React Server Component parser rejects and triggers the error.tsx boundary.
    return new Response('Offline', {
      status: 504,
      statusText: 'Gateway Timeout',
      headers: { 'Content-Type': 'text/x-component' },
    });
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

  let requestToHandle = event.request;

  // 1. App Mode Logic (Optimized)
  // We only block for critical state (Headers) on Documents, API, and RSC.
  // Static assets (images, fonts, scripts) skip this to avoid latency.
  if (isDocument || isRsc || isApi || isNavigation) {
    await ensureAppModeInitialized();
  }

  const isAppModeClient = event.clientId !== '' && isClientInAppMode(event.clientId);

  if (isApi) {
    try {
      return await fetch(event.request);
    } catch {
      return offlineFallback(
        event.request,
        url,
        isAppModeClient || url.searchParams.get('app-mode') === 'true',
      );
    }
  }

  // Fire-and-forget persistence (don't block response)
  if (isNavigation) {
    event.waitUntil(
      (async (): Promise<void> => {
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

  // 2. Targeted Injection (Header Strategy)
  // User Requirement: Use Header for everything (Documents, API, RSC). Never Query Param.
  const hasAppModeParameter = url.searchParams.get('app-mode') === 'true';
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
    return offlineFallback(event.request, url, isAppMode);
  }
}

export const handleFetchEvent =
  (serwist: Serwist): ((event: FetchEvent) => void) =>
  (event: FetchEvent): void => {
    // Bypass service worker entirely in draft mode
    if (isDraftMode(event.request.headers.get('cookie'))) {
      return; // Let the browser handle the request directly
    }

    // Bypass service worker for auth requests and trpc requests
    // trpc request are cached using tanstack query
    if (event.request.url.includes('/api/auth/') || event.request.url.includes('/api/trpc/')) {
      return;
    }

    event.respondWith(
      router(event, serwist).catch((criticalError: unknown) => {
        console.error(`[SW] Critical Error while Fetching ${event.request.url}:`, criticalError);
        return new Response('Critical SW Error', { status: 500 });
      }),
    );
  };
