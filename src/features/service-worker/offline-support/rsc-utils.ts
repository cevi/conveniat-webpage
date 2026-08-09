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

/**
 * Placeholder chat id used to prefetch a generic shell for the `/app/chat/[chatId]` routes.
 * Those routes are fully client rendered, so the server payload is identical for every chat.
 */
export const OFFLINE_CHAT_SHELL_ID = '00000000-0000-4000-8000-000000000000';

const UUID_SEGMENT = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;

/**
 * Routes whose rendered output does not depend on the dynamic segment because the page is
 * fully client rendered and reads the id from the URL (see `ChatIdProvider`). A cached
 * payload for one instance may therefore be replayed for any other instance of the pattern.
 *
 * `:uuid` only matches UUID shaped segments so that static siblings such as `/app/chat/new`
 * are never mistaken for a chat id.
 */
const REPLAYABLE_ROUTE_PATTERNS = ['/app/chat/:uuid', '/app/chat/:uuid/details'] as const;

function matchesRoutePattern(path: string, pattern: string): boolean {
  const pathSegments = path.split('/');
  const patternSegments = pattern.split('/');
  if (pathSegments.length !== patternSegments.length) return false;

  return patternSegments.every((patternSegment, index) => {
    const pathSegment = pathSegments[index] ?? '';
    if (patternSegment === ':uuid') return UUID_SEGMENT.test(pathSegment);
    return patternSegment === pathSegment;
  });
}

/**
 * Finds the replayable route pattern a path belongs to, if any.
 */
export function findReplayableRoutePattern(path: string): string | undefined {
  return REPLAYABLE_ROUTE_PATTERNS.find((pattern) => matchesRoutePattern(path, pattern));
}

/**
 * Finds a cached entry for a *different* instance of the same replayable route pattern,
 * e.g. `/app/chat/<a>/details` when `/app/chat/<b>/details` was requested.
 */
export function findReplayableSiblingKey(
  keys: readonly Request[],
  cleanPath: string,
): Request | undefined {
  const pattern = findReplayableRoutePattern(cleanPath);
  if (pattern === undefined) return undefined;

  return keys.find((request) => {
    const keyPath = getCleanAppPath(new URL(request.url).pathname);
    return keyPath !== cleanPath && matchesRoutePattern(keyPath, pattern);
  });
}

export function getCleanAppPath(pathname: string): string {
  let clean = pathname;
  const appIndex = clean.indexOf('/app/');
  if (appIndex !== -1) {
    clean = clean.slice(appIndex);
  } else if (clean.endsWith('/app')) {
    clean = '/app';
  }
  if (clean.length > 1 && clean.endsWith('/')) {
    clean = clean.slice(0, -1);
  }
  return clean;
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

  // 5. Replayable Dynamic Route Shell (e.g. /app/chat/<a>/details -> /app/chat/<b>/details).
  // Must run before the parent shell fallback, which would otherwise answer a chat details
  // request with the chat overview payload and render the wrong page.
  const siblingKey = findReplayableSiblingKey(keys, cleanPath);
  if (siblingKey) {
    console.log(`[SW] RSC Route Shell Hit for: ${originalUrl} -> ${siblingKey.url}`);
    const siblingMatch = await rscCache.match(siblingKey, { ignoreVary: true });
    if (siblingMatch) return sanitizeRscResponse(siblingMatch);
  }

  // 6. Parent Route Shell Fallback (e.g. /app/schedule/123 -> /app/schedule)
  const fallbackPrefix = Object.keys(RSC_SHELL_MAPPINGS).find(
    (prefix) => cleanPath === prefix || cleanPath.startsWith(prefix + '/'),
  );

  if (fallbackPrefix !== undefined && fallbackPrefix !== '') {
    const shellPath = RSC_SHELL_MAPPINGS[fallbackPrefix];
    if (shellPath !== undefined && shellPath !== '') {
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

  return undefined;
}
