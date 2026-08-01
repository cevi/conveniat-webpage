import {
  addAppModeClient,
  ensureAppModeInitialized,
  isClientInAppMode,
  persistAppModeClients,
} from '@/features/service-worker/app-mode';
import { CACHE_NAMES } from '@/features/service-worker/constants';
import { normalizeTileUrl } from '@/features/service-worker/offline-support/map-viewer';
import {
  getCleanAppPath,
  matchCachedRsc,
  sanitizeRscResponse,
} from '@/features/service-worker/offline-support/rsc-utils';
import { DesignModeTriggers } from '@/utils/design-codes';
import { isDraftMode } from '@/utils/draft-mode';
import { ServiceWorkerMessages } from '@/utils/service-worker-messages';
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

  // 4. CHAT FALLBACK
  if (cleanPath.startsWith('/app/chat')) {
    const chatKey = keys.find(
      (keyRequest) => getCleanAppPath(new URL(keyRequest.url).pathname) === '/app/chat',
    );
    if (chatKey) {
      match = await pagesCache.match(chatKey, { ignoreVary: true, ignoreSearch: true });
      if (match) return match;
    }
  }

  // 5. SCHEDULE FALLBACK
  if (cleanPath.startsWith('/app/schedule')) {
    const schedKey = keys.find(
      (keyRequest) => getCleanAppPath(new URL(keyRequest.url).pathname) === '/app/schedule',
    );
    if (schedKey) {
      match = await pagesCache.match(schedKey, { ignoreVary: true, ignoreSearch: true });
      if (match) return match;
    }
  }

  // 6. HELPER PORTAL FALLBACK
  if (cleanPath.startsWith('/app/helper-portal')) {
    const helperKey = keys.find(
      (keyRequest) => getCleanAppPath(new URL(keyRequest.url).pathname) === '/app/helper-portal',
    );
    if (helperKey) {
      match = await pagesCache.match(helperKey, { ignoreVary: true, ignoreSearch: true });
      if (match) return match;
    }
  }

  // 7. EMERGENCY FALLBACK
  if (cleanPath.startsWith('/app/emergency')) {
    const emergencyKey = keys.find(
      (keyRequest) => getCleanAppPath(new URL(keyRequest.url).pathname) === '/app/emergency',
    );
    if (emergencyKey) {
      match = await pagesCache.match(emergencyKey, { ignoreVary: true, ignoreSearch: true });
      if (match) return match;
    }
  }

  // 8. MAP FALLBACK
  if (cleanPath.startsWith('/app/map')) {
    const mapKey = keys.find(
      (keyRequest) => getCleanAppPath(new URL(keyRequest.url).pathname) === '/app/map',
    );
    if (mapKey) {
      match = await pagesCache.match(mapKey, { ignoreVary: true, ignoreSearch: true });
      if (match) return match;
    }
  }

  // 9. GENERAL DASHBOARD FALLBACK
  if (cleanPath.startsWith('/app/')) {
    const dashKey = keys.find(
      (keyRequest) => getCleanAppPath(new URL(keyRequest.url).pathname) === '/app/dashboard',
    );
    if (dashKey) {
      match = await pagesCache.match(dashKey, { ignoreVary: true, ignoreSearch: true });
      if (match) return match;
    }
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

    const cleanPath = getCleanAppPath(url.pathname);
    console.warn(
      `[SW] RSC Cache Miss for: ${url.toString()}. Redirecting to document fallback: ${cleanPath}`,
    );

    // Redirect to document route so browser loads the cached offline HTML page
    return new Response(undefined, {
      status: 307,
      headers: {
        Location: cleanPath,
      },
    });
  }

  // Strategy E: API Fallback
  if (isApi) {
    console.warn(`[SW] API offline fallback for: ${url.pathname}`);
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

  if (!isAppMode && request.destination !== 'document') {
    console.log(`[SW] Offline fallback skipped for non-document web request: ${url.pathname}`);
    return Response.error();
  }

  // Strategy B: Cached HTML Page
  if (request.destination === 'document') {
    const cleanPath = getCleanAppPath(url.pathname);

    // [HOTFIX]: Redirect offline visits for deep linked schedule entries to use query param
    // to avoid Next.js RSC router mismatch on optional catch-all segments.
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

    const cachedPage = await matchCachedPage(url.toString());
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
      `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline | conveniat</title><style>body{font-family:system-ui,-apple-system,sans-serif;background:#090d16;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center;padding:16px}h1{font-size:24px;margin-bottom:8px}p{color:#9ca3af;margin-bottom:24px}button{background:#2563eb;color:#fff;border:none;padding:12px 24px;border-radius:8px;font-weight:600;cursor:pointer}</style></head><body><div><h1>Du bist offline</h1><p>Diese Seite ist offline noch nicht verfügbar.</p><button onclick="window.location.reload()">Erneut versuchen</button></div></body></html>`,
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

  // Strategy D: Map Tiles (Cross-Origin, Load-Balanced)
  // vectortiles0-4 are interchangeable, but precache uses vectortiles0.
  if (url.host.includes('geo.admin.ch')) {
    const tileCache = await caches.open(CACHE_NAMES.MAP_TILES);
    const normalizedUrl = normalizeTileUrl(url.toString());
    const cachedTile = await tileCache.match(normalizedUrl, { ignoreVary: true });
    if (cachedTile) {
      console.log(`[SW] Serving cached map tile/asset for: ${url.toString()}`);
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

  const isAppModeClient =
    (event.clientId !== '' && isClientInAppMode(event.clientId)) ||
    (event.resultingClientId !== '' && isClientInAppMode(event.resultingClientId));

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
    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

    // Fast-path offline fallback for documents, RSC, and API requests when network is off
    if (isOffline) {
      console.log(`[SW] Fast Offline Fallback for ${url.pathname}`);
      return offlineFallback(event.request, url, isAppMode);
    }

    // If we are in App Mode and requesting a Document or RSC payload, bypass Serwist's
    // automatic precache which might contain Web Mode versions. Do a manual network-first fetch with a 3s timeout.
    if (isAppMode && (isDocument || isRsc)) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10_000);

      try {
        const networkResponse = await fetch(requestToHandle, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (networkResponse.ok) {
          const targetCacheName = isRsc ? CACHE_NAMES.RSC : CACHE_NAMES.PAGES;
          const cache = await caches.open(targetCacheName);
          if (isRsc) {
            void (async (): Promise<void> => {
              try {
                const cloned = networkResponse.clone();
                const buffer = await cloned.arrayBuffer();
                const cleanHeaders = new Headers(networkResponse.headers);
                cleanHeaders.delete('Vary');
                await cache.put(
                  url.toString(),
                  new Response(buffer, {
                    status: networkResponse.status,
                    statusText: networkResponse.statusText,
                    headers: cleanHeaders,
                  }),
                );
              } catch (error) {
                console.warn('[SW] App Mode RSC stream buffer write failed:', error);
              }
            })();
          } else {
            void cache.put(url.toString(), networkResponse.clone()).catch(console.warn);
          }
        }

        if (isRsc) return sanitizeRscResponse(networkResponse);
        return networkResponse;
      } catch (error) {
        clearTimeout(timeoutId);
        console.warn(
          `[SW] App Mode fetch timed out or failed for ${url.pathname}, bailing to offline fallback`,
          error,
        );
        return offlineFallback(event.request, url, isAppMode);
      }
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

    if (
      isAuthRequest &&
      (url.pathname.includes('/auth/signout') || url.pathname.includes('/auth/signin'))
    ) {
      event.waitUntil(
        (async (): Promise<void> => {
          await caches.delete(CACHE_NAMES.AUTH_SESSION);
        })(),
      );
    }

    if (isAuthRequest && url.pathname.endsWith('/csrf')) {
      event.respondWith(
        (async (): Promise<Response> => {
          try {
            return await fetch(event.request);
          } catch {
            return new Response(JSON.stringify({ csrfToken: 'offline-csrf-token' }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            });
          }
        })(),
      );
      return;
    }

    if (isAuthRequest && url.pathname.endsWith('/session')) {
      event.respondWith(
        (async (): Promise<Response> => {
          try {
            const networkResponse = await fetch(event.request);
            if (networkResponse.ok) {
              const clone = networkResponse.clone();
              try {
                const sessionData = (await clone.json()) as { user?: unknown };
                if (sessionData.user !== undefined && sessionData.user !== null) {
                  const authCache = await caches.open(CACHE_NAMES.AUTH_SESSION);
                  await authCache.put(event.request, networkResponse.clone());
                } else {
                  await caches.delete(CACHE_NAMES.AUTH_SESSION);
                }
              } catch {
                await caches.delete(CACHE_NAMES.AUTH_SESSION);
              }
            } else if (networkResponse.status === 401 || networkResponse.status === 403) {
              await caches.delete(CACHE_NAMES.AUTH_SESSION);
            }
            return networkResponse;
          } catch {
            const authCache = await caches.open(CACHE_NAMES.AUTH_SESSION);
            const cachedSession =
              (await authCache.match(event.request, { ignoreSearch: true, ignoreVary: true })) ??
              (await authCache.match('/api/auth/session', {
                ignoreSearch: true,
                ignoreVary: true,
              })) ??
              (await caches.match('/api/auth/session', { ignoreSearch: true, ignoreVary: true }));

            if (cachedSession) {
              try {
                const sessionData = (await cachedSession.clone().json()) as {
                  expires?: string;
                  user?: unknown;
                  [key: string]: unknown;
                };
                if (sessionData.user !== undefined && sessionData.user !== null) {
                  // Extend session expiry for 30 days offline so NextAuth client doesn't force logout
                  sessionData.expires = new Date(
                    Date.now() + 30 * 24 * 60 * 60 * 1000,
                  ).toISOString();
                  return new Response(JSON.stringify(sessionData), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                  });
                }
              } catch {
                return cachedSession;
              }
            }

            // Return minimal offline mock session to prevent unwanted logout redirects
            return new Response(
              JSON.stringify({
                user: {
                  id: 'offline-user',
                  uuid: 'offline-user-uuid',
                  name: 'Offline User',
                  email: 'offline@conveniat.ch',
                },
                expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              }),
              {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
              },
            );
          }
        })(),
      );
      return;
    }

    // Proxy bypass: We still want the SW to intercept these to provide the automatic
    // HTML retry wrapper on connection drops, but we skip cache lookup strategies.
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
            console.error(`[SW] bypass fetch failed or timed out: ${url.href}`, error);

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
        return offlineFallback(event.request, url, false);
      }),
    );
  };
