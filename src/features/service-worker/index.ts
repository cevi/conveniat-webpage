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
import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig } from 'serwist';
import { CacheFirst, NetworkFirst, Serwist, StaleWhileRevalidate } from 'serwist';

// Register features
registerMapOfflineSupport();

/**
 * Declares the global `__SW_MANIFEST` property on the `WorkerGlobalScope`.
 *
 * Serwist's build process injects the precache manifest (a list of URLs and
 * their revisions to be cached) into the Service Worker using this global
 * variable. This declaration informs TypeScript about the existence and
 * expected type of `__SW_MANIFEST`.
 *
 * @remarks
 * The default injection point string used by Serwist is `"self.__SW_MANIFEST"`.
 * This type declaration ensures type safety when accessing this variable within
 * the Service Worker context.
 *
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
 * Custom runtime caching configuration for robust offline support.
 * Uses StaleWhileRevalidate for static assets to enable offline functionality.
 */
const runtimeCaching: RuntimeCaching[] = [
  // Cache CSS files with StaleWhileRevalidate
  {
    matcher: /\/_next\/static\/.*\.css$/,
    handler: new StaleWhileRevalidate({
      cacheName: 'next-css-cache',
    }),
  },
  // Cache JS files and chunks with StaleWhileRevalidate
  {
    matcher: /\/_next\/static\/.*\.js$/,
    handler: new StaleWhileRevalidate({
      cacheName: 'next-js-cache',
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
    handler: new StaleWhileRevalidate({
      cacheName: 'images-cache',
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
  precacheEntries: self.__SW_MANIFEST ?? [],
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
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
  '/favicon.ico',
  '/favicon.svg',
  '/apple-touch-icon.png',
  '/notification-icon.png',
  '/web-app-manifest-192x192.png',
  '/web-app-manifest-512x512.png',
];

serwist.addToPrecacheList(
  criticalAssets.map((url) => ({
    url,
    revision: url === '/~offline' ? 'initial' : crypto.randomUUID(),
  })),
);

// Add precache assets from the offline registry
serwist.addToPrecacheList(
  offlineRegistry.getPrecacheAssets().map((url) => ({
    url,
    revision: crypto.randomUUID(),
  })),
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
async function prefetchOfflinePages(): Promise<void> {
  console.log(`[SW] Prefetching ${offlinePages.length} offline pages: ${offlinePages.join(', ')}`);

  const pagesCache = await caches.open('pages-cache');

  for (const pageUrl of offlinePages) {
    try {
      // Fetch the page - this triggers loading all dependencies
      // which get cached by the runtime caching rules
      const response = await fetch(pageUrl, {
        credentials: 'same-origin',
        headers: {
          Accept: 'text/html',
        },
      });

      if (response.ok) {
        // Cache the page HTML
        await pagesCache.put(pageUrl, response.clone());
        console.log(`[SW] Successfully prefetched HTML: ${pageUrl}`);
      }

      // Also prefetch the RSC payload for this page
      const rscUrl = `${pageUrl}${pageUrl.includes('?') ? '&' : '?'}_rsc`;
      const rscResponse = await fetch(rscUrl, {
        credentials: 'same-origin',
        headers: {
          RSC: '1',
        },
      });

      if (rscResponse.ok) {
        const rscCache = await caches.open('next-rsc-cache');
        await rscCache.put(rscUrl, rscResponse.clone());
        console.log(`[SW] Successfully prefetched RSC: ${rscUrl}`);
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
  event.waitUntil(Promise.all([self.clients.claim(), prefetchOfflinePages()]));
  console.log('[SW] Activated and ready to handle requests.');
});

// This should be called after all custom event listeners are registered
serwist.addEventListeners();
