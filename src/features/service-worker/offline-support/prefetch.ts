import { CACHE_NAMES, TIMEOUTS } from '@/features/service-worker/constants';
import { offlinePages } from '@/features/service-worker/offline-support/offline-pages';
import { offlineRegistry } from '@/features/service-worker/offline-support/offline-registry';
import { getCleanAppPath } from '@/features/service-worker/offline-support/rsc-utils';
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
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      console.log(`[SW] Aborting fetch for ${url} because device is offline`);
      return undefined;
    }

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

const inFlightAssetRequests = new Map<string, Promise<void>>();

async function cacheAsset(url: string): Promise<void> {
  // 1. Deduplicate concurrent identical requests
  if (inFlightAssetRequests.has(url)) {
    return inFlightAssetRequests.get(url);
  }

  const doCache = async (): Promise<void> => {
    // Determine target cache first
    const isMapTile = url.includes('vectortiles') || url.includes('geo.admin.ch');
    let cacheTarget: Cache;
    if (isMapTile) {
      cacheTarget = await caches.open(CACHE_NAMES.MAP_TILES);
    } else if (/\.(woff2?|ttf|otf|eot)(\?.*)?$/i.test(url)) {
      cacheTarget = await caches.open(CACHE_NAMES.FONTS);
    } else {
      cacheTarget = await caches.open(CACHE_NAMES.OFFLINE_ASSETS);
    }

    // Check if it already exists to prevent duplicate fetches
    const existing = await cacheTarget.match(new Request(url, { mode: 'cors' }));
    if (existing) {
      return;
    }

    const isSameOrigin =
      url.startsWith('/') || new URL(url, location.origin).origin === location.origin;

    const response = await fetchWithRetryAndTimeout(
      url,
      {
        mode: 'cors',
        ...(isSameOrigin
          ? {
              headers: {
                [DesignModeTriggers.HEADER_IMPLICIT]: 'true',
              },
            }
          : {}),
      },
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

    // Always cache using the ORIGINAL normalized URL (vectortiles0)
    await cacheTarget.put(new Request(url, { mode: 'cors' }), safeResponse);
  };

  const promise = doCache();
  inFlightAssetRequests.set(url, promise);

  try {
    await promise;
  } finally {
    inFlightAssetRequests.delete(url);
  }
}

function extractAssetUrls(htmlText: string, rscText?: string): string[] {
  const assets = new Set<string>();

  // 1. Script tags: <script src="...">
  const scriptRegex = /<script[^>]+src=["']([^"']+)["']/gi;
  let match: RegExpExecArray | null = scriptRegex.exec(htmlText);
  while (match !== null) {
    if (
      match[1] !== undefined &&
      (match[1].startsWith('/_next/static/') || match[1].endsWith('.js'))
    ) {
      assets.add(match[1]);
    }
    match = scriptRegex.exec(htmlText);
  }

  // 2. Link stylesheet tags: <link ... href="...">
  const linkRegex = /<link[^>]+href=["']([^"']+)["']/gi;
  match = linkRegex.exec(htmlText);
  while (match !== null) {
    if (
      match[1] !== undefined &&
      (match[1].startsWith('/_next/static/') || match[1].endsWith('.css'))
    ) {
      assets.add(match[1]);
    }
    match = linkRegex.exec(htmlText);
  }

  // 3. Next.js static chunk paths referenced in HTML & RSC Flight stream
  const chunkRegex =
    /(?:\/_next\/)?static\/(?:chunks|css|media)\/[a-zA-Z0-9_.~%\-/]+\.(?:js|css|woff2?|ttf)/g;
  match = chunkRegex.exec(htmlText);
  while (match !== null) {
    if (match[0].length > 0) {
      const fullPath = match[0].startsWith('/_next/') ? match[0] : `/_next/${match[0]}`;
      assets.add(fullPath);
    }
    match = chunkRegex.exec(htmlText);
  }

  if (rscText !== undefined && rscText !== '') {
    match = chunkRegex.exec(rscText);
    while (match !== null) {
      if (match[0].length > 0) {
        const fullPath = match[0].startsWith('/_next/') ? match[0] : `/_next/${match[0]}`;
        assets.add(fullPath);
      }
      match = chunkRegex.exec(rscText);
    }
  }

  return [...assets];
}

const inFlightPageRequests = new Map<string, Promise<void>>();

async function cacheSinglePageAndScrape(pageUrl: string): Promise<void> {
  if (inFlightPageRequests.has(pageUrl)) {
    return inFlightPageRequests.get(pageUrl);
  }

  const doPageCache = async (): Promise<void> => {
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

    let rscText = '';

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
      let rscResponse = await fetchWithRetryAndTimeout(
        rscUrl,
        {
          credentials: 'same-origin',
          headers: rscHeaders,
        },
        TIMEOUTS.RSC_FETCH,
        false,
      );

      if (rscResponse === undefined) {
        console.warn(`[SW] RSC Prefetch failed for ${rscUrl}`);
      } else {
        const contentType = rscResponse.headers.get('content-type');
        const isRscData = contentType?.includes('text/x-component');

        // RETRY STRATEGY: If we got HTML (200 OK) instead of RSC, try adding a dummy value.
        if (rscResponse.ok && isRscData === false) {
          console.warn(`[SW] RSC Prefetch returned HTML for ${rscUrl}. Retrying with hash...`);

          const retryUrl = new URL(pageUrl, location.origin);
          retryUrl.searchParams.append('_rsc', '1');

          rscResponse = await fetchWithRetryAndTimeout(
            retryUrl.toString(),
            {
              credentials: 'same-origin',
              headers: rscHeaders,
            },
            TIMEOUTS.RSC_FETCH,
            false,
          );
        }

        if (rscResponse?.ok === true) {
          const finalContentType = rscResponse.headers.get('content-type');
          if (finalContentType?.includes('text/x-component') === true) {
            const safeRscHeaders = cleanHeaders(rscResponse.headers);
            const rscBlob = await rscResponse.blob();
            rscText = await rscBlob.text();

            const safeRscResponse = new Response(rscText, {
              status: rscResponse.status,
              headers: safeRscHeaders,
            });

            await rscCache.put(rscUrl, safeRscResponse.clone());
            // Also store under clean path variant for fast O(1) matching
            const cleanUrl = `${urlObject.origin}${getCleanAppPath(pageUrl)}`;
            const cleanRscUrl = `${cleanUrl}?_rsc`;
            await rscCache.put(cleanRscUrl, safeRscResponse.clone());
            await rscCache.put(cleanUrl, safeRscResponse);
            console.log(`[SW] RSC Cached (Confirmed Flight Data): ${rscUrl} and ${cleanRscUrl}`);
          } else {
            console.error(`[SW] SKIPPING RSC Cache for ${pageUrl}. Received ${finalContentType}`);
          }
        }
      }
    } catch (error) {
      console.warn(`[SW] RSC Network Error`, error);
    }

    // F. Extract and prefetch all JS & CSS chunk dependencies referenced in page HTML and RSC stream
    const extractedAssets = extractAssetUrls(htmlText, rscText);
    if (extractedAssets.length > 0) {
      console.log(
        `[SW] Extracted ${extractedAssets.length} static JS/CSS chunk dependencies from ${pageUrl}`,
      );
      await Promise.all(
        extractedAssets.map((assetUrl) =>
          limit(async () => {
            try {
              await cacheAsset(assetUrl);
            } catch (error) {
              console.warn(`Chunk asset prefetch failed: ${assetUrl}`, error);
            }
          }),
        ),
      );
    }
  };

  const promise = doPageCache();
  inFlightPageRequests.set(pageUrl, promise);

  try {
    await promise;
  } finally {
    inFlightPageRequests.delete(pageUrl);
  }
}

export async function cachePageAndScrape(pageUrl: string): Promise<void> {
  await cacheSinglePageAndScrape(pageUrl);
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
  const allAssetsToPrefetch = new Set([...registryAssets, ...manifestUrls]);

  const totalItems = pagesToPrefetch.size + allAssetsToPrefetch.size;
  let processedItems = 0;

  console.log(
    `[SW] Prefetching ${pagesToPrefetch.size} pages and ${allAssetsToPrefetch.size} assets (total: ${totalItems})`,
  );

  const updateProgress = (): void => {
    processedItems++;
    if (clientId !== undefined && clientId !== '' && onProgress !== undefined) {
      onProgress(totalItems, Math.min(processedItems, totalItems));
    }
  };

  // 1. Prefetch Core HTML Pages FIRST so page shells are immediately available offline
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

  // 2. Prefetch Registry Assets & Serwist Manifest Assets
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

  // Set the "offline enabled" flag after successful prefetch
  await setOfflineSupportEnabled(true);

  console.log('[SW] Prefetching complete.');
}
