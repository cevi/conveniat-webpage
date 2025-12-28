import {
  addAppModeClient,
  ensureAppModeInitialized,
  isClientInAppMode,
  persistAppModeClients,
} from '@/features/service-worker/app-mode';
import { DesignModeTriggers } from '@/utils/design-codes';
import type { Serwist } from 'serwist';

function sanitizeRscResponse(response: Response): Response {
  const newHeaders = new Headers(response.headers);
  newHeaders.delete('Vary');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

/**
 * Robustly attempts to find a cached RSC response.
 */
async function matchCachedRsc(originalUrl: string): Promise<Response | undefined> {
  const rscCache = await caches.open('next-rsc-cache');
  const urlObject = new URL(originalUrl);

  // 1. Try Exact Match
  const exactMatch = await rscCache.match(originalUrl, { ignoreVary: true });
  if (exactMatch) return sanitizeRscResponse(exactMatch); // Sanitize

  // 2. Try matching by "base" RSC URL
  const cleanParameters = new URLSearchParams(urlObject.searchParams);
  cleanParameters.set('_rsc', '');
  const reconstructedUrl = `${urlObject.origin}${urlObject.pathname}?${cleanParameters.toString().replace('_rsc=', '_rsc')}`;

  const reconstructedMatch = await rscCache.match(reconstructedUrl, { ignoreVary: true });
  if (reconstructedMatch) {
    return sanitizeRscResponse(reconstructedMatch); // Sanitize
  }

  // 3. Deep Search: Fuzzy Match
  const keys = await rscCache.keys();
  const matchingKey = keys.find((request) => {
    const keyUrl = new URL(request.url);
    if (keyUrl.pathname !== urlObject.pathname) return false;
    if (!keyUrl.searchParams.has('_rsc')) return false;

    const keyParameters = keyUrl.searchParams;
    const requestParameters = urlObject.searchParams;

    for (const [key, val] of keyParameters.entries()) {
      if (key !== '_rsc' && requestParameters.get(key) !== val) return false;
    }

    return true;
  });

  if (matchingKey) {
    const match = await rscCache.match(matchingKey, { ignoreVary: true });
    if (match) return sanitizeRscResponse(match);
  }

  // 4. SCHEDULE FALLBACK
  if (
    urlObject.pathname.startsWith('/app/schedule/') &&
    !urlObject.pathname.includes('offline-entry')
  ) {
    const offlineShellKey = keys.find((k) => {
      const kUrl = new URL(k.url);
      return kUrl.pathname === '/app/schedule/offline-entry';
    });

    if (offlineShellKey) {
      console.log('[SW] Serving Offline Shell RSC for:', originalUrl);
      const shellMatch = await rscCache.match(offlineShellKey);
      if (shellMatch) return sanitizeRscResponse(shellMatch);
    }
  }

  return undefined;
}

async function matchCachedPage(originalUrl: string): Promise<Response | undefined> {
  const pagesCache = await caches.open('pages-cache');
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

  return undefined;
}

export const handleFetchEvent =
  (serwist: Serwist): ((event: FetchEvent) => void) =>
  (event: FetchEvent): void => {
    event.respondWith(
      (async (): Promise<Response> => {
        const url = new URL(event.request.url);

        try {
          await ensureAppModeInitialized();

          const isNavigation = event.request.mode === 'navigate';
          const hasAppModeParameter = url.searchParams.get('app-mode') === 'true';

          let isAppMode = false;
          if (hasAppModeParameter || (event.clientId !== '' && isClientInAppMode(event.clientId))) {
            isAppMode = true;
          }

          if (isAppMode && isNavigation && event.resultingClientId !== '') {
            addAppModeClient(event.resultingClientId);
            await persistAppModeClients();
          }

          const isSameOrigin = url.origin === self.location.origin;

          const requestToHandle =
            isAppMode && isSameOrigin
              ? new Request(event.request, {
                  headers: {
                    ...Object.fromEntries(event.request.headers),
                    [DesignModeTriggers.HEADER_IMPLICIT]: 'true',
                  },
                })
              : event.request;

          try {
            const response = await serwist.handleRequest({
              request: requestToHandle,
              event,
            });
            if (response) {
              if (url.searchParams.has('_rsc')) {
                return sanitizeRscResponse(response);
              }
              return response;
            }

            const networkResponse = await fetch(requestToHandle);
            if (
              (!networkResponse.ok && networkResponse.status !== 404) ||
              networkResponse.status >= 500
            ) {
              throw new Error('Server Error or Offline');
            }
            return networkResponse;
          } catch {
            const isRscRequest = url.searchParams.has('_rsc');
            const isDocument = requestToHandle.destination === 'document';

            // 1. RSC Data (Soft Navigation)
            if (isRscRequest) {
              const cachedRsc = await matchCachedRsc(url.toString());
              if (cachedRsc) {
                return cachedRsc;
              }
              console.warn(`[SW] RSC Cache Miss for: ${url.toString()}. Returning error response.`);
              return Response.error();
            }

            // 2. Document (Hard Reload / Initial Load)
            if (isDocument) {
              const cachedPage = await matchCachedPage(url.toString());
              if (cachedPage) return cachedPage;

              const offlinePage = await caches.match('/~offline', { ignoreVary: true });
              if (offlinePage) return offlinePage;
            }

            // Fallback for assets
            const fallbackMatch = await caches.match(event.request, {
              ignoreSearch: true,
              ignoreVary: true,
            });

            if (fallbackMatch) {
              console.log(`[SW] Serving fallback for: ${url.toString()}`);
              return fallbackMatch;
            }

            console.error(`[SW] Fetch failed and no cache/fallback found for: ${url.toString()}`);
            return Response.error();
          }
        } catch (criticalError) {
          console.error('[SW] Critical Error:', criticalError);
          return new Response('Critical SW Error', { status: 500 });
        }
      })(),
    );
  };
