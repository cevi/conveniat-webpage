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
  // PostHog Analytics: Fail silently (no cache lookup, no error logs)
  if (url.pathname.startsWith('/ingest/')) {
    return Response.error();
  }

  const isRsc =
    url.searchParams.has('_rsc') ||
    request.headers.has('RSC') ||
    request.headers.has('Next-Router-Prefetch');

  const isServerAction = request.headers.has('Next-Action');
  const isApi = url.pathname.startsWith('/api/');

  // Strategy A: Cached RSC or 504 Timeout
  // For RSC requests, we ALWAYS return a 504 instead of Response.error()
  // explicitly to prevent Next.js App Router from throwing unhandled "TypeError: Failed to fetch"
  if (isRsc) {
    let cachedRsc: Response | undefined;
    if (isAppMode) {
      cachedRsc = await matchCachedRsc(url.toString());
    }
    if (cachedRsc) return cachedRsc;

    console.warn(`[SW] RSC Cache Miss for: ${url.toString()}. Returning 504 response.`);
    // IMPORTANT: Returning Response.error() causes Next.js App Router to hang indefinitely
    // or crash with an unhandled TypeError. We must return a valid HTTP Error (like 504) so
    // the React Server Component parser rejects and triggers the error.tsx boundary cleanly.
    return new Response(`Offline: ${url.toString()}`, {
      status: 504,
      statusText: 'Gateway Timeout',
      headers: { 'Content-Type': 'text/x-component' },
    });
  }

  // Strategy E: API Fallback
  // Return a proper HTTP response instead of Response.error() to prevent app hangs
  if (isApi || isServerAction) {
    console.warn(`[SW] API/Action offline fallback for: ${url.pathname}`);
    return new Response(
      JSON.stringify({
        error: 'offline',
        message: 'You are offline. This request requires an internet connection.',
        url: url.toString(),
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  // PWA only: Browser users should see the standard browser offline error for documents and assets.
  if (!isAppMode) {
    console.log(`[SW] Offline fallback skipped for browser user: ${url.pathname}`);
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

  console.error(`[SW] Fetch failed and no cache/fallback found for: ${url.toString()}`);
  return Response.error();
}

async function router(event: FetchEvent, serwist: Serwist): Promise<Response> {
  const url = new URL(event.request.url);
  const isNavigation = event.request.mode === 'navigate';
  const isRsc =
    url.searchParams.has('_rsc') ||
    event.request.headers.has('RSC') ||
    event.request.headers.has('Next-Router-Prefetch');
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

  // Detect native app WebView via User-Agent (matches the server-side check in design-rewrite-proxy.ts).
  // This is the most reliable signal: the WebView ALWAYS sends 'KonektaApp/1.0' in the UA,
  // regardless of SW state, client ID tracking, or query params.
  const userAgent = event.request.headers.get('user-agent') ?? '';
  const isNativeAppWebView = userAgent.includes('KonektaApp');

  if (isApi) {
    try {
      return await fetch(event.request);
    } catch {
      return offlineFallback(
        event.request,
        url,
        isAppModeClient || isNativeAppWebView || url.searchParams.get('app-mode') === 'true',
      );
    }
  }

  // Fire-and-forget persistence (don't block response)
  if (isNavigation) {
    event.waitUntil(
      (async (): Promise<void> => {
        const hasAppModeParameter = url.searchParams.get('app-mode') === 'true';
        if (
          (hasAppModeParameter ||
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
  // User Requirement: Use Header for everything (Documents, API, RSC). Never Query Param.
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
    // If we are in App Mode and requesting a Document or RSC payload, bypass Serwist's
    // automatic precache which might contain Web Mode versions. Do a manual network-first fetch.
    if (isAppMode && (isDocument || isRsc)) {
      const networkResponse = await fetch(requestToHandle);

      const contentType = networkResponse.headers.get('content-type') ?? '';
      const isJsAsset = url.pathname.endsWith('.js') || url.pathname.endsWith('.mjs');

      if (!networkResponse.ok && isJsAsset && contentType.includes('text/html')) {
        return Response.error();
      }

      if (isRsc) return sanitizeRscResponse(networkResponse);
      return networkResponse;
    }

    // 3. Serwist Strategies
    const response = await serwist.handleRequest({
      request: requestToHandle,
      event,
    });

    if (response) {
      if (isRsc) {
        return sanitizeRscResponse(response);
      }

      return response;
    }

    const networkResponse = await fetch(requestToHandle);

    const isJsAsset = url.pathname.endsWith('.js') || url.pathname.endsWith('.mjs');
    const contentType = networkResponse.headers.get('content-type') ?? '';

    // Prevent Next.js 404/5xx HTML pages from being parsed as scripts
    if (!networkResponse.ok && isJsAsset && contentType.includes('text/html')) {
      console.error(
        `[SW] Blocked HTML response for script fetch: ${requestToHandle.url} (Status: ${networkResponse.status})`,
      );
      return Response.error(); // Trigger Next.js chunk-load error handling cleanly
    }

    return networkResponse;
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
    const url = new URL(event.request.url);

    const isPreviewRequest =
      isDraftMode(event.request.headers.get('cookie')) ||
      url.searchParams.get('preview') === 'true';

    const isAdminPanel = url.pathname.startsWith('/admin');
    const isAuthRequest = url.pathname.startsWith('/api/auth/');
    const isIngestRequest = url.pathname.startsWith('/ingest');
    const isTrpcRequest = url.pathname.startsWith('/api/trpc/');

    // avoid the service worker for admin panel and ingest requests
    if (isAdminPanel || isIngestRequest) {
      return;
    }

    // Proxy bypass: We still want the SW to intercept these to provide the automatic
    // HTML retry wrapper on connection drops, but we skip cache lookup strategies.
    const bypassSWProxy = isPreviewRequest || isAuthRequest || isTrpcRequest;

    if (bypassSWProxy) {
      event.respondWith(
        (async (): Promise<Response> => {
          try {
            return await fetch(event.request);
          } catch (error) {
            console.error(`[SW] bypass fetch failed (backend overloaded): ${url.href}`, error);

            // If it's a navigation request and the server dumped the connection,
            // returning Response.error() causes a hard browser crash (chrome-error).
            // We must return a graceful HTML proxy so global-error.tsx can render and auto-retry!
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
            return new Response('Backend Overloaded', { status: 503 });
          }
        })(),
      );
      return;
    }

    event.respondWith(
      router(event, serwist).catch((criticalError: unknown) => {
        console.error(`[SW] Critical Error while Fetching ${event.request.url}:`, criticalError);
        return new Response(`Critical SW Error: ${event.request.url}`, { status: 500 });
      }),
    );
  };
