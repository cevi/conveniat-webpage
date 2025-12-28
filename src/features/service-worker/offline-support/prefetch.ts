import { offlinePages } from '@/features/service-worker/offline-support/offline-pages';
import { offlineRegistry } from '@/features/service-worker/offline-support/offline-registry';
import { DesignModeTriggers } from '@/utils/design-codes';

export const OFFLINE_STATUS_CACHE = 'offline-status-cache';
export const OFFLINE_ENABLED_FLAG = 'offline-enabled';

export function getCacheNameForUrl(url: string): string {
  if (/\.css(\?.*)?$/i.test(url)) return 'next-css-cache';
  if (/\.(woff2?|ttf|otf|eot)(\?.*)?$/i.test(url)) return 'next-fonts-cache';
  if (/\.(png|jpg|jpeg|svg|gif|webp|ico)(\?.*)?$/i.test(url)) return 'images-cache';
  if (/\.js(\?.*)?$/i.test(url)) return 'next-js-cache';
  return 'offline-assets-cache';
}

function scrapeCssForAssets(cssText: string): Set<string> {
  const assets = new Set<string>();
  const cssUrlRegex = /url\(['"]?(?<url>[^)'"]+)['"]?\)/gi;
  let match;
  while ((match = cssUrlRegex.exec(cssText)) !== null) {
    const url = match.groups?.['url'];
    if (url !== undefined && !url.startsWith('data:') && url.trim().length > 0) {
      assets.add(url);
    }
  }
  return assets;
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

export async function prefetchOfflinePages(
  clientId?: string,
  onProgress?: (total: number, current: number) => void,
): Promise<void> {
  const pagesToPrefetch = new Set<string>(offlinePages);

  const registryPages = offlineRegistry.getPrefetchUrls();
  for (const url of registryPages) pagesToPrefetch.add(url);

  const registryAssets = offlineRegistry.getPrecacheAssets();
  const totalItems = pagesToPrefetch.size + registryAssets.length;
  let processedItems = 0;

  console.log(`[SW] Prefetching ${pagesToPrefetch.size} pages and ${registryAssets.length} assets`);

  const pagesCache = await caches.open('pages-cache');
  const rscCache = await caches.open('next-rsc-cache');
  const mapTilesCache = await caches.open('map-tiles-cache');

  // 1. Registry Assets
  for (const url of registryAssets) {
    try {
      const request = new Request(url, { mode: 'cors' });
      const response = await fetch(request);

      if (!response.ok) {
        console.warn(`[SW] Failed to fetch registry asset: ${url}`);
        continue;
      }

      const safeHeaders = cleanHeaders(response.headers);
      const safeResponse = new Response(await response.blob(), {
        status: response.status,
        statusText: response.statusText,
        headers: safeHeaders,
      });

      const cacheTarget =
        // eslint-disable-next-line no-nested-ternary
        url.includes('vectortiles') || url.includes('geo.admin.ch')
          ? mapTilesCache
          : /\.(woff2?|ttf|otf|eot)(\?.*)?$/i.test(url)
            ? await caches.open('next-fonts-cache')
            : await caches.open('offline-assets-cache');

      await cacheTarget.put(request, safeResponse);
    } catch (error) {
      console.warn(`[SW] Failed to prefetch asset: ${url}`, error);
    }
    processedItems++;
    if (clientId !== undefined && onProgress) onProgress(totalItems, processedItems);
  }

  // 2. Pages
  for (const pageUrl of pagesToPrefetch) {
    try {
      console.log(`[SW] Fetching HTML for: ${pageUrl}`);
      const response = await fetch(pageUrl, {
        credentials: 'same-origin',
        headers: {
          Accept: 'text/html',
          [DesignModeTriggers.HEADER_IMPLICIT]: 'true',
        },
      });

      if (!response.ok) {
        console.warn(`[SW] Fetch failed for ${pageUrl}: ${response.status} ${response.statusText}`);
        continue;
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

      // Scrape Assets
      const assetUrls = new Set<string>();
      const tagRegex =
        /<(?<tag>link|script|img)\s+(?:[^>]*?\s+)?(?:href|src)=["'](?<url>[^"']+)["'][^>]*>/gi;
      let match;
      while ((match = tagRegex.exec(htmlText)) !== null) {
        const url: string | undefined = match.groups?.['url'];
        if (url !== undefined) assetUrls.add(url);
      }
      const inlineAssets = scrapeCssForAssets(htmlText);
      for (const url of inlineAssets) assetUrls.add(url);
      const chunkRegex =
        /["'](\/_next\/static\/chunks\/[^"']+\.js)["']|["'](static\/chunks\/[^"']+\.js)["']/g;
      while ((match = chunkRegex.exec(htmlText)) !== null) {
        let path: string | undefined = match[1] ?? match[2];
        if (path !== undefined) {
          if (path.startsWith('static/')) path = '/_next/' + path;
          assetUrls.add(path);
        }
      }

      const validAssets = new Set<string>();
      const assetExtensionRegex =
        /\.(css|js|woff2?|ttf|otf|eot|png|jpg|jpeg|svg|gif|webp|ico)(\?.*)?$/i;

      for (const url of assetUrls) {
        const cleanUrl = url.replaceAll('&amp;', '&');
        const isRelative = cleanUrl.startsWith('/') && !cleanUrl.startsWith('//');
        const isNextAsset = cleanUrl.startsWith('/_next/');
        const isExternal = cleanUrl.startsWith('http');
        if ((isRelative || isNextAsset || isExternal) && assetExtensionRegex.test(cleanUrl)) {
          validAssets.add(cleanUrl);
        }
      }

      await Promise.all(
        [...validAssets].map(async (url) => {
          try {
            const requestInit: RequestInit = url.startsWith('http')
              ? { mode: 'cors', credentials: 'omit' }
              : { headers: { [DesignModeTriggers.HEADER_IMPLICIT]: 'true' } };

            const assetResponse = await fetch(url, requestInit);
            if (assetResponse.ok || assetResponse.type === 'opaque') {
              const cacheName = getCacheNameForUrl(url);
              const specificCache = await caches.open(cacheName);
              const safeAssetHeaders = cleanHeaders(assetResponse.headers);
              const safeAssetResponse = new Response(await assetResponse.blob(), {
                status: assetResponse.status,
                statusText: assetResponse.statusText,
                headers: safeAssetHeaders,
              });
              await specificCache.put(url, safeAssetResponse);
            }
          } catch {
            /* ignore */
          }
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
    } catch (error) {
      console.error(`[SW] Error prefetching ${pageUrl}:`, error);
    }
    processedItems++;
    if (clientId !== undefined && onProgress) onProgress(totalItems, processedItems);
  }

  // Set the "offline enabled" flag after successful prefetch
  await setOfflineSupportEnabled(true);

  console.log('[SW] Prefetching complete.');
}
