import { CACHE_NAMES } from '@/features/service-worker/constants';

/**
 * CONFIGURATION
 * Map specific route prefixes to their "Offline Shell" RSC representation.
 * This allows O(1) fallback lookups without scanning the cache.
 *
 * Note: Schedule pages are now fully client-side rendered and don't need
 * a separate offline shell - the main page works offline via tRPC cache.
 */
const RSC_SHELL_MAPPINGS: Record<string, string> = {
  '/app/schedule': '/app/schedule',
  '/app/chat': '/app/chat',
  '/app/helper-portal': '/app/helper-portal',
  '/app/emergency': '/app/emergency',
  '/app/map': '/app/map',
  '/app/dashboard': '/app/dashboard',
  '/app/settings': '/app/settings',
  '/app/announcement-preview': '/app/dashboard',
};

export function getCleanAppPath(pathname: string): string {
  const appIndex = pathname.indexOf('/app/');
  if (appIndex !== -1) {
    return pathname.slice(appIndex);
  }
  if (pathname.endsWith('/app')) {
    return '/app';
  }
  return pathname;
}

/**
 * Helper: consistently strips the _rsc hash to ensure cache hits.
 * Matches the logic used in caching.ts 'cacheKeyWillBeUsed'.
 */
function getNormalizedRscUrl(url: string): string {
  const urlObject = new URL(url);
  // We explicitly set the value to empty string to match the write-strategy
  urlObject.searchParams.set('_rsc', '');
  // Returns: https://.../path?param=val&_rsc
  return urlObject.toString().replace('_rsc=', '_rsc');
}

/**
 * Ensures the response is clean for the client (removes Vary header).
 */
export function sanitizeRscResponse(response: Response): Response {
  // Optimization: If headers are already clean, don't clone
  if (!response.headers.has('Vary')) return response;

  const newHeaders = new Headers(response.headers);
  newHeaders.delete('Vary');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

/**
 * Robustly attempts to find a cached RSC response using O(1) lookups and fallback matching.
 */
export async function matchCachedRsc(originalUrl: string): Promise<Response | undefined> {
  const rscCache = await caches.open(CACHE_NAMES.RSC);
  const urlObject = new URL(originalUrl);
  const cleanPath = getCleanAppPath(urlObject.pathname);

  // 1. Try Exact Match (Fastest)
  const exactMatch = await rscCache.match(originalUrl, { ignoreVary: true });
  if (exactMatch) return sanitizeRscResponse(exactMatch);

  // 2. Try Normalized Match (Standard Strategy)
  const normalizedUrl = getNormalizedRscUrl(originalUrl);
  const normalizedMatch = await rscCache.match(normalizedUrl, { ignoreVary: true });
  if (normalizedMatch) return sanitizeRscResponse(normalizedMatch);

  // 3. Try Clean URL Match without query parameters (except _rsc)
  const cleanRscUrl = `${urlObject.origin}${cleanPath}?_rsc`;
  const cleanRscMatch = await rscCache.match(cleanRscUrl, { ignoreVary: true });
  if (cleanRscMatch) return sanitizeRscResponse(cleanRscMatch);

  // 4. Exact Pathname Match across cached keys
  const keys = await rscCache.keys();
  const matchingKey = keys.find((request) => {
    const keyPath = getCleanAppPath(new URL(request.url).pathname);
    return keyPath === cleanPath;
  });

  if (matchingKey) {
    console.log(`[SW] RSC Pathname Hit for: ${originalUrl} -> ${matchingKey.url}`);
    const pathnameMatch = await rscCache.match(matchingKey, { ignoreVary: true });
    if (pathnameMatch) return sanitizeRscResponse(pathnameMatch);
  }

  // 5. Parent Route Shell Fallback (e.g. /app/schedule/123 -> /app/schedule)
  const fallbackPrefix = Object.keys(RSC_SHELL_MAPPINGS).find(
    (prefix) => cleanPath === prefix || cleanPath.startsWith(prefix + '/'),
  );

  if (fallbackPrefix) {
    const shellPath = RSC_SHELL_MAPPINGS[fallbackPrefix];
    if (shellPath) {
      const shellKey = keys.find((request) => {
        const keyPath = getCleanAppPath(new URL(request.url).pathname);
        return keyPath === shellPath;
      });

      if (shellKey) {
        console.log(`[SW] RSC Parent Shell Hit for: ${originalUrl} -> ${shellKey.url}`);
        const shellMatch = await rscCache.match(shellKey, { ignoreVary: true });
        if (shellMatch) return sanitizeRscResponse(shellMatch);
      }
    }
  }

  // 6. Final Dashboard RSC Fallback
  const dashboardKey = keys.find((request) => {
    const keyPath = getCleanAppPath(new URL(request.url).pathname);
    return keyPath === '/app/dashboard';
  });

  if (dashboardKey) {
    console.log(`[SW] RSC Dashboard Fallback for: ${originalUrl} -> ${dashboardKey.url}`);
    const dashboardMatch = await rscCache.match(dashboardKey, { ignoreVary: true });
    if (dashboardMatch) return sanitizeRscResponse(dashboardMatch);
  }

  return undefined;
}
