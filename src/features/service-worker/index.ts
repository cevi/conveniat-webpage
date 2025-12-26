import { offlinePages } from '@/config/offline-pages';
import {
  registerMapOfflineSupport,
  tileURLRewriter,
} from '@/features/service-worker/offline-support/map-viewer';
import { offlineRegistry } from '@/features/service-worker/offline-support/offline-registry';
import {
  notificationClickHandler,
  pushNotificationHandler,
} from '@/features/service-worker/push-notifications';
import { DesignModeTriggers } from '@/utils/design-codes';
import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig, SerwistPlugin } from 'serwist';
import { CacheFirst, NetworkFirst, NetworkOnly, Serwist, StaleWhileRevalidate } from 'serwist';

// Register features
registerMapOfflineSupport();

/**
 * @see {@link https://serwist.pages.dev/docs/next/getting-started | Serwist Documentation}
 */
declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

// Ensures the global `self` variable is correctly typed as `ServiceWorkerGlobalScope`.
declare const self: ServiceWorkerGlobalScope;

/**
 * Capture the precache manifest in a local variable.
 * This ensures that the string "self.__SW_MANIFEST" only appears once in the
 * source code, which is a requirement for Serwist's injectManifest tool.
 */
const swManifest = self.__SW_MANIFEST;

/**
 * Plugin to prevent caching of HTML responses for non-HTML requests (e.g. 404 pages for JS files)
 */
const badResponsePlugin: SerwistPlugin = {
  cacheWillUpdate: ({ response }) => {
    if (response.headers.get('content-type')?.includes('text/html')) {
      return;
    }
    return response;
  },
};

const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Custom runtime caching configuration for robust offline support.
 * Uses StaleWhileRevalidate for static assets to enable offline functionality.
 */
const runtimeCaching: RuntimeCaching[] = [
  // Cache CSS files
  {
    matcher: /\/_next\/static\/.*\.css$/,
    handler: isDevelopment
      ? new NetworkOnly()
      : new StaleWhileRevalidate({
          cacheName: 'next-css-cache',
          plugins: [badResponsePlugin],
        }),
  },
  // Cache JS files and chunks
  {
    matcher: /\/_next\/static\/.*\.js$/,
    handler: isDevelopment
      ? new NetworkOnly()
      : new StaleWhileRevalidate({
          cacheName: 'next-js-cache',
          plugins: [badResponsePlugin],
        }),
  },
  // Cache Next.js RSC data with StaleWhileRevalidate
  {
    matcher: ({ url }) => url.searchParams.has('_rsc'),
    handler: new NetworkFirst({
      cacheName: 'next-rsc-cache',
      // If network fails, this will fall back to the cache.
      // We also want to provide a specific fallback if NOT in cache.
      plugins: [
        {
          handlerDidError: async (): Promise<Response> => {
            // Return the cached offline RSC payload if navigation fails
            return (await caches.match('/~offline?_rsc')) || Response.error();
          },
        },
      ],
    }),
  },
  // Cache fonts with CacheFirst (fonts rarely change)
  {
    matcher: /\/_next\/static\/media\/.*\.(woff2?|ttf|otf|eot)$/,
    handler: new CacheFirst({
      cacheName: 'next-fonts-cache',
    }),
  },
  // Cache Next.js fonts endpoint
  {
    matcher: /\/__nextjs_font\/.*/,
    handler: new CacheFirst({
      cacheName: 'nextjs-font-cache',
    }),
  },
  // Cache images with StaleWhileRevalidate
  {
    matcher: /\.(png|jpg|jpeg|svg|gif|webp|ico)$/,
    handler: isDevelopment
      ? new NetworkOnly()
      : new StaleWhileRevalidate({
          cacheName: 'images-cache',
          plugins: [badResponsePlugin],
        }),
  },
  // Cache API responses with NetworkFirst (prefer fresh data, but use cache if offline)
  {
    matcher: /\/api\/.*/,
    handler: new NetworkFirst({
      cacheName: 'api-cache',
      networkTimeoutSeconds: 10,
    }),
  },
  // Cache page navigations with NetworkFirst
  {
    matcher: ({ request }: { request: Request }): boolean => request.destination === 'document',
    handler: new NetworkFirst({
      cacheName: 'pages-cache',
      networkTimeoutSeconds: 10,
    }),
  },
  // Add runtime caching rules from the offline registry
  ...offlineRegistry.getRuntimeCaching(),
];

// Initialize Serwist with custom caching for robust offline support
const serwist = new Serwist({
  precacheEntries: swManifest ?? [],
  skipWaiting: true,
  clientsClaim: true,
  // Disabled to prevent error: 'The service worker navigation preload request was cancelled before preloadResponse settled'
  navigationPreload: false,
  runtimeCaching,
  fallbacks: {
    entries: [
      {
        url: '/~offline',
        matcher({ request }): boolean {
          return request.destination === 'document';
        },
      },
    ],
  },
});

// Ensure critical assets are precached
const criticalAssets = [
  '/~offline',
  '/entrypoint?app-mode=true',
  '/favicon.ico',
  '/favicon.svg',
  '/apple-touch-icon.png',
  '/notification-icon.png',
  '/web-app-manifest-192x192.png',
  '/web-app-manifest-512x512.png',
];

/**
 * Filter assets that are already in the precache manifest to avoid conflicts.
 */
const normalizeUrl = (url: string): string => {
  try {
    // If it's a full URL, strip origin and leading slash
    const parsed = new URL(url, 'https://example.com');
    return parsed.pathname.replace(/^\/+/, '');
  } catch {
    // Fallback for relative paths: strip leading slash
    return url.replace(/^\/+/, '');
  }
};

/**
 * Filter assets that are already in the precache manifest to avoid conflicts.
 */
const getNewPrecacheEntries = (
  urls: string[],
  revisionGenerator: (url: string) => string,
): PrecacheEntry[] => {
  const existingNormalized = new Set(
    (swManifest ?? []).map((entry) => {
      const url = typeof entry === 'string' ? entry : entry.url;
      return normalizeUrl(url);
    }),
  );

  return urls
    .filter((url) => !existingNormalized.has(normalizeUrl(url)))
    .map((url) => ({
      url,
      revision: revisionGenerator(url),
    }));
};

serwist.addToPrecacheList(
  getNewPrecacheEntries(criticalAssets, (url) =>
    url === '/~offline' ? 'initial' : crypto.randomUUID(),
  ),
);

// Add precache assets from the offline registry
serwist.addToPrecacheList(
  getNewPrecacheEntries(offlineRegistry.getPrecacheAssets(), () => crypto.randomUUID()),
);

// Map viewer specific catch handler for tile rewriting
serwist.setCatchHandler(tileURLRewriter(serwist));

/**
 * Prefetch offline pages and cache them with all their dependencies.
 *
 * This function fetches each configured offline page, which triggers
 * the browser to load all CSS, JS, fonts, and images. The runtime
 * caching rules (StaleWhileRevalidate) automatically cache these
 * resources as they are loaded.
 */
/**
 * Prefetch offline pages and cache them with all their dependencies.
 *
 * This function fetches each configured offline page, which fetches the HTML.
 * It then parses the HTML to find all linked CSS and JS files, and fetches
 * them as well to ensure they are cached by the runtime caching rules.
 */
async function prefetchOfflinePages(): Promise<void> {
  console.log(`[SW] Prefetching ${offlinePages.length} offline pages: ${offlinePages.join(', ')}`);

  const pagesCache = await caches.open('pages-cache');

  for (const pageUrl of offlinePages) {
    try {
      // 1. Fetch the page HTML
      const response = await fetch(pageUrl, {
        credentials: 'same-origin',
        headers: { Accept: 'text/html' },
      });

      if (!response.ok) {
        console.warn(`[SW] Failed to fetch offline page: ${pageUrl}`);
        continue;
      }

      // 2. Clone the response to store it in the cache
      // We need to read the body to parse it, so we must cache a clone or new response
      const htmlText = await response.text();
      await pagesCache.put(pageUrl, new Response(htmlText, response));
      console.log(`[SW] Successfully prefetched HTML: ${pageUrl}`);

      // 3. Parse dependencies (CSS, JS, Preloads) from HTML
      // We look for:
      // - <link rel="stylesheet" href="...">
      // - <script src="...">
      // - <link rel="preload" as="script" href="...">
      const assetUrls = new Set<string>();
      const tagRegex = /<(?<tag>link|script)[^>]*(?:href|src)=["'](?<url>[^"']+)["'][^>]*>/gi;

      let match;
      while ((match = tagRegex.exec(htmlText)) !== null) {
        const url = match.groups?.['url'];
        if (!url) continue;

        // Only cache local Next.js static assets
        if (
          (url.startsWith('/_next/') || (url.startsWith('/') && !url.startsWith('//'))) && // Basic filter to avoid external stuff or data links
          /\.(css|js|woff2?|ttf|otf|png|jpg|jpeg|svg|webp|ico)$/.test(url)
        ) {
          assetUrls.add(url);
        }
      }

      console.log(`[SW] Found ${assetUrls.size} dependencies for ${pageUrl}`);

      // 4. Fetch and cache all found assets
      // These fetches will trigger the 'fetch' event listener and go through
      // the Runtime Caching rules (e.g. StaleWhileRevalidate for static assets)
      await Promise.all(
        [...assetUrls].map(async (url) => {
          try {
            await fetch(url, { mode: 'no-cors' });
          } catch (error) {
            console.warn(`[SW] Failed to prefetch asset: ${url}`, error);
          }
        }),
      );

      // 5. Also prefetch the RSC payload for this page
      const rscUrl = `${pageUrl}${pageUrl.includes('?') ? '&' : '?'}_rsc`;
      try {
        const rscResponse = await fetch(rscUrl, {
          credentials: 'same-origin',
          headers: { RSC: '1' },
        });
        if (rscResponse.ok) {
          const rscCache = await caches.open('next-rsc-cache');
          await rscCache.put(rscUrl, rscResponse.clone());
          console.log(`[SW] Successfully prefetched RSC: ${rscUrl}`);
        }
      } catch (error) {
        // RSC might fail or not be relevant for some pages
        console.debug(`[SW] Could not prefetch RSC for ${pageUrl}`, error);
      }
    } catch (error) {
      console.error(`[SW] Error prefetching ${pageUrl}:`, error);
    }
  }

  console.log('[SW] Prefetching complete.');
}

// Push notifications
self.addEventListener('push', pushNotificationHandler(self));
self.addEventListener('pushsubscriptionchange', () => {});
self.addEventListener('notificationclick', notificationClickHandler(self));
self.addEventListener('notificationclose', () => {});

// Service worker lifecycle events
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([self.clients.claim(), prefetchOfflinePages(), pruneInactiveClients()]),
  );
  console.log('[SW] Activated and ready to handle requests.');
});

// This should be called after all custom event listeners are registered
// Persistent storage for App Mode client IDs
const APP_MODE_CACHE_NAME = 'app-mode-persistence-v1';
const APP_MODE_STORAGE_KEY = '/app-mode-clients';

let appModeClients = new Set<string>();
let isInitialized = false;

/**
 * Loads the persisted App Mode client IDs from the cache.
 */
async function ensureInitialized(): Promise<void> {
  if (isInitialized) return;
  try {
    const cache = await caches.open(APP_MODE_CACHE_NAME);
    const response = await cache.match(APP_MODE_STORAGE_KEY);
    if (response) {
      const persistedIds = (await response.json()) as string[];
      appModeClients = new Set(persistedIds);
    }
  } catch (error) {
    console.error('[SW] Failed to load persistent app mode clients:', error);
  } finally {
    isInitialized = true;
  }
}

/**
 * Persists the current App Mode client IDs to the cache.
 */
async function persistAppModeClients(): Promise<void> {
  try {
    const cache = await caches.open(APP_MODE_CACHE_NAME);
    await cache.put(
      APP_MODE_STORAGE_KEY,
      new Response(JSON.stringify([...appModeClients]), {
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  } catch (error) {
    console.error('[SW] Failed to persist app mode clients:', error);
  }
}

/**
 * Prunes inactive client IDs from the persistent storage.
 */
async function pruneInactiveClients(): Promise<void> {
  await ensureInitialized();
  const currentClients = await self.clients.matchAll();
  const currentClientIds = new Set(currentClients.map((client) => client.id));

  const initialSize = appModeClients.size;
  for (const id of appModeClients) {
    if (!currentClientIds.has(id)) {
      appModeClients.delete(id);
    }
  }

  if (appModeClients.size !== initialSize) {
    await persistAppModeClients();
  }
}

self.addEventListener('message', (event) => {
  const data = event.data as { type?: string } | undefined;
  if (data?.type === 'SET_APP_MODE' && event.source instanceof Client) {
    const clientId = event.source.id;
    event.waitUntil(
      (async (): Promise<void> => {
        await ensureInitialized();
        if (!appModeClients.has(clientId)) {
          appModeClients.add(clientId);
          await persistAppModeClients();
          console.log(`[SW] Client registered for App Mode: ${clientId}`);
        }
      })(),
    );
  }
});

/**
 * Suppress 'Cache.put' NetworkErrors.
 * These usually happen when a response stream is interrupted (e.g. navigation) while being cached.
 * They are generally harmless as the cache just doesn't get updated.
 */
self.addEventListener('unhandledrejection', (event) => {
  const error: unknown = event.reason;
  if (
    error instanceof Error &&
    error.name === 'NetworkError' &&
    error.message.includes('Cache.put')
  ) {
    event.preventDefault();
    console.debug('[SW] Suppressed Cache.put network error:', error);
  }
});

self.addEventListener('fetch', (event) => {
  // Perform detection and handle request
  event.respondWith(
    (async (): Promise<Response> => {
      await ensureInitialized();

      const url = new URL(event.request.url);
      const isInternal = url.origin === self.location.origin;

      if (!isInternal) {
        const response = await serwist.handleRequest({
          request: event.request,
          event,
        });
        return response ?? fetch(event.request);
      }

      const isNavigation = event.request.mode === 'navigate';
      const hasAppModeParameter =
        url.searchParams.get('app-mode') === 'true' ||
        url.searchParams.get(DesignModeTriggers.QUERY_PARAM_FORCE) === 'true';

      /**
       * Detection logic refinement:
       * 1. Explicitly registered via message (persistent for the client lifetime)
       * 2. Navigation with app-mode parameter (initial latch from manifest/shortcut)
       * 3. Navigation from an already registered app client (internal link)
       * 4. Subresource request from a registered client
       * 5. Fallback: Manual header presence (for CURL/manual testing)
       */
      let isAppMode = false;
      let detectionSource = 'NONE';

      if (isNavigation) {
        if (hasAppModeParameter) {
          isAppMode = true;
          detectionSource = 'QUERY_PARAM';
        } else if (event.clientId && appModeClients.has(event.clientId)) {
          isAppMode = true;
          detectionSource = 'SOURCE_CLIENT';
        } else if (event.request.headers.get(DesignModeTriggers.HEADER_IMPLICIT) === 'true') {
          isAppMode = true;
          detectionSource = 'EXISTING_HEADER';
        }
      } else {
        // Subresource
        if (event.clientId && appModeClients.has(event.clientId)) {
          isAppMode = true;
          detectionSource = 'SUBRESOURCE_FROM_CLIENT';
        } else if (event.request.headers.get(DesignModeTriggers.HEADER_IMPLICIT) === 'true') {
          isAppMode = true;
          detectionSource = 'SUBRESOURCE_WITH_HEADER';
        }
      }

      // Debug logging for navigations or when app mode is enabled
      if (isNavigation || (isAppMode && !url.pathname.startsWith('/_next/'))) {
        console.log('************************************');
        console.log(
          `[SW] App Mode: ${isAppMode ? 'ENABLED 📱' : 'DISABLED 🌐'} (Via: ${detectionSource})`,
        );
        console.log(`[SW] URL: ${event.request.url}`);
        console.log(`[SW] Client ID: ${event.clientId || 'none'}`);
        if (isNavigation) {
          console.log(`[SW] Resulting ID: ${event.resultingClientId || 'none'}`);
        }
        console.log('************************************');
      }

      // Propagate app mode status to the resulting client
      if (
        isAppMode &&
        isNavigation &&
        event.resultingClientId &&
        !appModeClients.has(event.resultingClientId)
      ) {
        appModeClients.add(event.resultingClientId);
        await persistAppModeClients();
      }

      const requestToHandle = isAppMode
        ? ((): Request => {
            const newHeaders = new Headers(event.request.headers);
            if (newHeaders.get(DesignModeTriggers.HEADER_IMPLICIT) !== 'true') {
              newHeaders.set(DesignModeTriggers.HEADER_IMPLICIT, 'true');
            }
            return new Request(event.request, { headers: newHeaders });
          })()
        : event.request;

      const response = await serwist.handleRequest({
        request: requestToHandle,
        event,
      });

      return response ?? fetch(requestToHandle);
    })(),
  );
});

serwist.addEventListeners();
