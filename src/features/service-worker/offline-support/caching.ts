import { tileURLRewriter } from '@/features/service-worker/offline-support/map-viewer';
import { offlineRegistry } from '@/features/service-worker/offline-support/offline-registry';
import { defaultCache } from '@serwist/turbopack/worker';
import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig, SerwistPlugin } from 'serwist';
import {
  CacheableResponsePlugin,
  CacheFirst,
  ExpirationPlugin,
  NetworkFirst,
  NetworkOnly,
  Serwist,
  StaleWhileRevalidate,
} from 'serwist';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const isDevelopment = process['env'].NODE_ENV === 'development';

const customRuntimeCaching: RuntimeCaching[] = [
  // Cache CSS files
  {
    matcher: /\/_next\/static\/.*\.css$/,
    handler: isDevelopment
      ? new NetworkOnly()
      : new StaleWhileRevalidate({
          cacheName: 'next-css-cache',
          plugins: [
            new CacheableResponsePlugin({
              statuses: [200],
            }) as SerwistPlugin,
          ],
        }),
  },
  // Cache JS files
  {
    matcher: /\/_next\/static\/.*\.js$/,
    handler: isDevelopment
      ? new NetworkOnly()
      : new StaleWhileRevalidate({
          cacheName: 'next-js-cache',
          plugins: [
            new CacheableResponsePlugin({
              statuses: [200],
            }) as SerwistPlugin,
            {
              cacheWillUpdate: ({ response }) => {
                if (response.headers.get('content-type')?.includes('text/html') === true) {
                  return;
                }
                return response;
              },
            } as SerwistPlugin,
          ],
        }),
  },
  // Cache Next.js RSC data with NetworkFirst
  {
    matcher: ({ url }) => url.searchParams.has('_rsc'),
    handler: new NetworkFirst({
      cacheName: 'next-rsc-cache',
      matchOptions: { ignoreVary: true },
      plugins: [
        new CacheableResponsePlugin({
          statuses: [200],
        }) as SerwistPlugin,
        {
          cacheKeyWillBeUsed: ({ request }) => {
            const url = new URL(request.url);
            const params = new URLSearchParams(url.searchParams);
            params.set('_rsc', '');
            return `${url.origin}${url.pathname}?${params.toString().replace('_rsc=', '_rsc')}`;
          },
          cacheWillUpdate: ({ request, response }) => {
            if (
              (request.headers.get('next-router-prefetch') !== null ||
                request.headers.get('rsc') === '1') &&
              request.headers.get('next-router-prefetch') !== null
            ) {
              return;
            }
            return response;
          },
          cachedResponseWillBeUsed: ({ cachedResponse }) => {
            if (cachedResponse) {
              const newHeaders = new Headers(cachedResponse.headers);
              newHeaders.delete('Vary');
              return new Response(cachedResponse.body, {
                status: 200,
                statusText: 'OK',
                headers: newHeaders,
              });
            }
            return cachedResponse;
          },
        } as SerwistPlugin,
      ],
    }),
  },
  // Cache fonts
  {
    matcher: /\/_next\/static\/media\/.*\.(woff2?|ttf|otf|eot)$/,
    handler: new CacheFirst({
      cacheName: 'next-fonts-cache',
      plugins: [
        new CacheableResponsePlugin({ statuses: [200] }) as SerwistPlugin,
        new ExpirationPlugin({ maxEntries: 50 }) as SerwistPlugin,
      ],
    }),
  },
  // Cache Next.js fonts endpoint
  {
    matcher: /\/__nextjs_font\/.*/,
    handler: new CacheFirst({
      cacheName: 'nextjs-font-cache',
      plugins: [new CacheableResponsePlugin({ statuses: [200] }) as SerwistPlugin],
    }),
  },
  // Cache images
  {
    matcher: /\.(png|jpg|jpeg|svg|gif|webp|ico)$/,
    handler: isDevelopment
      ? new NetworkOnly()
      : new StaleWhileRevalidate({
          cacheName: 'images-cache',
          plugins: [new CacheableResponsePlugin({ statuses: [200] }) as SerwistPlugin],
        }),
  },
  // Cache API responses
  {
    matcher: /\/api\/.*/,
    handler: new NetworkFirst({
      cacheName: 'api-cache',
      networkTimeoutSeconds: 10,
      plugins: [
        new CacheableResponsePlugin({
          statuses: [200],
        }) as SerwistPlugin,
      ],
    }),
  },
  // Cache page navigations
  {
    matcher: ({ request }: { request: Request }): boolean => request.destination === 'document',
    handler: new NetworkFirst({
      cacheName: 'pages-cache',
      networkTimeoutSeconds: 10,
    }),
  },
  ...offlineRegistry.getRuntimeCaching(),
];

const runtimeCaching: RuntimeCaching[] = [...customRuntimeCaching, ...defaultCache];

export const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST ?? [],
  skipWaiting: true,
  clientsClaim: true,
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

serwist.setCatchHandler(tileURLRewriter());
