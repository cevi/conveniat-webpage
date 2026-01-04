import { CACHE_NAMES } from '@/features/service-worker/constants';

/**
 * CONFIGURATION
 * Map specific route prefixes to their "Offline Shell" RSC representation.
 * This allows O(1) fallback lookups without scanning the cache.
 */
const RSC_SHELL_MAPPINGS: Record<string, string> = {
  '/app/schedule': '/app/schedule/offline-entry',
};

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
 * Robustly attempts to find a cached RSC response using O(1) lookups.
 *
 * NOTE: We use `{ ignoreVary: true }` in all match calls. This is critical for offline support
 * and soft navigation. The browser's cache matching is very strict about `Vary` headers.
 * Since RSC requests often have varying headers (like `Base-Url`, `Next-Router-State-Tree`, or even `RSC`),
 * a strict match often fails even if the correct content is cached. Ignoring vary ensures we return
 * the content we have, which `sanitizeRscResponse` then cleans up for the client.
 */
export async function matchCachedRsc(originalUrl: string): Promise<Response | undefined> {
  const rscCache = await caches.open(CACHE_NAMES.RSC);

  // 1. Try Exact Match (Fastest)
  const exactMatch = await rscCache.match(originalUrl, { ignoreVary: true });
  if (exactMatch) return sanitizeRscResponse(exactMatch);

  // 2. Try Normalized Match (Standard Strategy)
  // This works because caching.ts saves all RSC with the normalized key.
  // We don't need to scan keys manually.
  const normalizedUrl = getNormalizedRscUrl(originalUrl);
  const normalizedMatch = await rscCache.match(normalizedUrl, { ignoreVary: true });
  if (normalizedMatch) return sanitizeRscResponse(normalizedMatch);

  // 3. Smart Fallback (Shell Injection)
  // Instead of scanning keys, we check if this route has a registered shell.
  const urlObject = new URL(originalUrl);
  const fallbackPath = Object.keys(RSC_SHELL_MAPPINGS).find((prefix) =>
    urlObject.pathname.startsWith(prefix),
  );

  if (fallbackPath) {
    // Construct the Fallback URL dynamically
    // We assume the shell is also cached in a normalized state
    const shellPath = RSC_SHELL_MAPPINGS[fallbackPath];
    if (!shellPath) return undefined;
    const shellUrl = new URL(shellPath, urlObject.origin).toString();
    const normalizedShellUrl = getNormalizedRscUrl(shellUrl);

    console.debug(`[SW] RSC Miss. Attempting fallback shell: ${normalizedShellUrl}`);

    const shellMatch = await rscCache.match(normalizedShellUrl, { ignoreVary: true });
    if (shellMatch) return sanitizeRscResponse(shellMatch);
  }

  // 4. Deep Search (Fuzzy Match / Pathname Only)
  // This supports parameterized URLs (e.g., /app/map?lat=...) by finding the base page
  const keys = await rscCache.keys();
  const matchingKey = keys.find((request) => {
    const keyUrl = new URL(request.url);
    return keyUrl.pathname === urlObject.pathname;
  });

  if (matchingKey) {
    console.debug(`[SW] RSC Fuzzy Hit for: ${originalUrl} -> ${matchingKey.url}`);
    const fuzzyMatch = await rscCache.match(matchingKey, { ignoreVary: true });
    if (fuzzyMatch) return sanitizeRscResponse(fuzzyMatch);
  }

  return undefined;
}
