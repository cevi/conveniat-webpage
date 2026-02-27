import { CACHE_NAMES, TIMEOUTS } from '@/features/service-worker/constants';
import { offlinePages } from '@/features/service-worker/offline-support/offline-pages';
import { offlineRegistry } from '@/features/service-worker/offline-support/offline-registry';
import { DesignModeTriggers } from '@/utils/design-codes';

export const OFFLINE_STATUS_CACHE = CACHE_NAMES.OFFLINE_STATUS;
export const OFFLINE_ENABLED_FLAG = 'offline-enabled';

// Simple p-limit implementation to avoid dependencies
const pLimit = (concurrency: number) => {
  const queue: (() => void)[] = [];
  let activeCount = 0;

  const next = (): void => {
    activeCount--;
    const task = queue.shift();
    if (task) task();
  };

  return async <T>(function_: () => Promise<T>): Promise<T> => {
    if (activeCount >= concurrency) {
      await new Promise<void>((resolve) => queue.push(resolve));
    }
    activeCount++;
    try {
      return await function_();
    } finally {
      next();
    }
  };
};

const limit = pLimit(TIMEOUTS.PREFETCH_CONCURRENCY);

export function getCacheNameForUrl(url: string): string {
  if (/\.css(\?.*)?$/i.test(url)) return CACHE_NAMES.CSS;
  if (/\.(woff2?|ttf|otf|eot)(\?.*)?$/i.test(url)) return CACHE_NAMES.FONTS;
  if (/\.(png|jpg|jpeg|svg|gif|webp|ico)(\?.*)?$/i.test(url)) return CACHE_NAMES.IMAGES;
  if (/\.js(\?.*)?$/i.test(url)) return CACHE_NAMES.JS;
  return CACHE_NAMES.OFFLINE_ASSETS;
}

function cleanHeaders(headers: Headers): Headers {
  const newHeaders = new Headers();
  for (const [key, value] of headers.entries()) {
    if (!['content-encoding', 'content-length'].includes(key.toLowerCase())) {
      newHeaders.append(key, value);
    }
  }
  return newHeaders;
}

/**
 * Robust fetch wrapper with timeout, retries, and exponential backoff.
 * Optionally load-balances across map tile servers (vectortiles0-4).
 */
async function fetchWithRetryAndTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = TIMEOUTS.ASSET_FETCH,
  shouldLoadBalance = false,
): Promise<Response | undefined> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= TIMEOUTS.MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    // Load Balancing: Randomly select a server 0-4 for map tiles
    let targetUrl = url;
    if (shouldLoadBalance && url.includes('vectortiles')) {
      const randomServer = Math.floor(Math.random() * 5); // 0 to 4
      targetUrl = url.replace(/vectortiles[0-9]/, `vectortiles${randomServer}`);
    }

    try {
      if (attempt > 0) {
        // Exponential backoff: 500ms, 1000ms, 2000ms...
        const delay = TIMEOUTS.BACKOFF_BASE * Math.pow(2, attempt - 1);
        console.log(`[SW] Retry attempt ${attempt} for ${targetUrl} after ${delay}ms`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      console.log(
        `[SW] Fetching: ${targetUrl} (Attempt ${attempt + 1}/${TIMEOUTS.MAX_RETRIES + 1})`,
      );
      const response = await fetch(targetUrl, { ...options, signal: controller.signal });

      if (response.ok || response.type === 'opaque') {
        return response;
      }

      console.warn(`[SW] Fetch failed with status ${response.status} for ${targetUrl}`);
      // Don't retry 404s - the resource doesn't exist
      if (response.status === 404) {
        return undefined;
      }
      // Throw to trigger retry for other errors (5xx, etc.)
      throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
      const isAbort = error instanceof DOMException && error.name === 'AbortError';
      console.warn(
        `[SW] Fetch error for ${targetUrl}: ${isAbort ? 'Timeout' : (error as Error).message}`,
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  console.error(
    `[SW] Failed to download ${url} after ${TIMEOUTS.MAX_RETRIES + 1} attempts. Last error:`,
    lastError,
  );
  return undefined;
}

export async function isOfflineSupportEnabled(): Promise<boolean> {
  const cache = await caches.open(OFFLINE_STATUS_CACHE);
  const response = await cache.match(OFFLINE_ENABLED_FLAG);
  return response !== undefined;
}

export async function setOfflineSupportEnabled(enabled: boolean): Promise<void> {
  const cache = await caches.open(OFFLINE_STATUS_CACHE);
  await (enabled
    ? cache.put(OFFLINE_ENABLED_FLAG, new Response('true'))
    : cache.delete(OFFLINE_ENABLED_FLAG));
}

async function cacheAsset(url: string): Promise<void> {
  const mapTilesCache = await caches.open(CACHE_NAMES.MAP_TILES);

  // Use load balancing for map tiles (vectortiles0-4)
  const isMapTile = url.includes('vectortiles') || url.includes('geo.admin.ch');
  const response = await fetchWithRetryAndTimeout(
    url,
    { mode: 'cors' },
    TIMEOUTS.ASSET_FETCH,
    isMapTile,
  );

  if (response === undefined) {
    console.warn(`[SW] Skipping cache for failed asset: ${url}`);
    return;
  }

  const safeHeaders = cleanHeaders(response.headers);
  const safeResponse = new Response(await response.blob(), {
    status: response.status,
    statusText: response.statusText,
    headers: safeHeaders,
  });

  const cacheTarget =
    // eslint-disable-next-line no-nested-ternary
    isMapTile
      ? mapTilesCache
      : /\.(woff2?|ttf|otf|eot)(\?.*)?$/i.test(url)
        ? await caches.open(CACHE_NAMES.FONTS)
        : await caches.open(CACHE_NAMES.OFFLINE_ASSETS);

  // Always cache using the ORIGINAL normalized URL (vectortiles0)
  await cacheTarget.put(new Request(url, { mode: 'cors' }), safeResponse);
}

async function cachePageAndScrape(pageUrl: string): Promise<void> {
  console.log(`[SW] Fetching HTML for: ${pageUrl}`);
  const pagesCache = await caches.open(CACHE_NAMES.PAGES);
  const rscCache = await caches.open(CACHE_NAMES.RSC);

  // Use robust fetch with timeout for page HTML
  const response = await fetchWithRetryAndTimeout(
    pageUrl,
    {
      credentials: 'same-origin',
      headers: {
        Accept: 'text/html',
        [DesignModeTriggers.HEADER_IMPLICIT]: 'true',
      },
    },
    TIMEOUTS.ASSET_FETCH,
    false, // No load balancing for pages
  );

  if (response === undefined) {
    console.warn(`[SW] Skipping page prefetch for failed URL: ${pageUrl}`);
    return;
  }

  const htmlText = await response.text();
  const safeHeaders = cleanHeaders(response.headers);

  await pagesCache.put(
    pageUrl,
    new Response(htmlText, {
      status: response.status,
      statusText: response.statusText,
      headers: safeHeaders,
    }),
  );

  // E. Prefetch RSC (Updated Logic)
  const urlObject = new URL(pageUrl, location.origin);
  // We start by trying the clean URL (empty value)
  urlObject.searchParams.append('_rsc', '');
  const rscUrl = urlObject.toString().replace('_rsc=', '_rsc');

  const rscHeaders = {
    RSC: '1',
    [DesignModeTriggers.HEADER_IMPLICIT]: 'true',
  };

  try {
    let rscResponse = await fetch(rscUrl, {
      credentials: 'same-origin',
      headers: rscHeaders,
    });

    const contentType = rscResponse.headers.get('content-type');
    const isRscData = contentType?.includes('text/x-component');

    // RETRY STRATEGY: If we got HTML (200 OK) instead of RSC, try adding a dummy value.
    // Next.js servers sometimes serve HTML for empty `_rsc` params but Flight data for `_rsc=1`
    if (rscResponse.ok && isRscData === false) {
      console.warn(`[SW] RSC Prefetch returned HTML for ${rscUrl}. Retrying with hash...`);

      const retryUrl = new URL(pageUrl, location.origin);
      retryUrl.searchParams.append('_rsc', '1'); // Add dummy value

      rscResponse = await fetch(retryUrl.toString(), {
        credentials: 'same-origin',
        headers: rscHeaders,
      });
    }

    const finalContentType = rscResponse.headers.get('content-type');
    if (rscResponse.ok && finalContentType?.includes('text/x-component') === true) {
      const safeRscHeaders = cleanHeaders(rscResponse.headers);
      const safeRscResponse = new Response(await rscResponse.blob(), {
        status: rscResponse.status,
        headers: safeRscHeaders,
      });

      await rscCache.put(rscUrl, safeRscResponse);
      console.log(`[SW] RSC Cached (Confirmed Flight Data): ${rscUrl}`);
    } else {
      console.error(`[SW] SKIPPING RSC Cache for ${pageUrl}. Received ${finalContentType}`);
    }
  } catch (error) {
    console.warn(`[SW] RSC Network Error`, error);
  }
}

export async function prefetchOfflinePages(
  clientId?: string,
  onProgress?: (total: number, current: number) => void,
): Promise<void> {
  // Use Type assertion for global Serwist config (injected by Webpack)
  const swManifest =
    (globalThis as unknown as { __SW_MANIFEST?: ({ url: string } | string)[] }).__SW_MANIFEST ?? [];
  const manifestUrls = swManifest.map((entry) => (typeof entry === 'string' ? entry : entry.url));

  const pagesToPrefetch = new Set<string>(offlinePages);

  const registryPages = offlineRegistry.getPrefetchUrls();
  for (const url of registryPages) pagesToPrefetch.add(url);

  const registryAssets = offlineRegistry.getPrecacheAssets();
  const totalItems = pagesToPrefetch.size + registryAssets.length;
  let processedItems = 0;

  console.log(`[SW] Prefetching ${pagesToPrefetch.size} pages and ${registryAssets.length} assets`);

  const updateProgress = (): void => {
    processedItems++;
    if (clientId !== undefined && clientId !== '' && onProgress !== undefined) {
      onProgress(totalItems, processedItems);
    }
  };

  // 1. Prefetch Registry Assets & Serwist Manifest Assets (Concurrent but limited)
  const allAssetsToPrefetch = new Set([...registryAssets, ...manifestUrls]);

  await Promise.all(
    [...allAssetsToPrefetch].map((url) =>
      limit(async () => {
        try {
          await cacheAsset(url);
        } catch (error) {
          console.warn(`Asset prefetch failed: ${url}`, error);
        } finally {
          updateProgress();
        }
      }),
    ),
  );

  // 2. Prefetch Pages (Sequential or Limited)
  // Pages are heavier (scraping involves parsing), so we keep concurrency low
  await Promise.all(
    [...pagesToPrefetch].map((pageUrl) =>
      limit(async () => {
        try {
          await cachePageAndScrape(pageUrl);
        } catch (error) {
          console.error(`Page prefetch failed: ${pageUrl}`, error);
        } finally {
          updateProgress();
        }
      }),
    ),
  );

  // Set the "offline enabled" flag after successful prefetch
  await setOfflineSupportEnabled(true);

  console.log('[SW] Prefetching complete.');
}
