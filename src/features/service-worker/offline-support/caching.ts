import { CACHE_NAMES, TIMEOUTS } from '@/features/service-worker/constants';
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

const cssCaching: RuntimeCaching = {
  matcher: /\/_next\/static\/.*\.css$/,
  handler: isDevelopment
    ? new NetworkOnly()
    : new StaleWhileRevalidate({
        cacheName: CACHE_NAMES.CSS,
        plugins: [
          new CacheableResponsePlugin({
            statuses: [200],
          }) as SerwistPlugin,
        ],
      }),
};

const jsCaching: RuntimeCaching = {
  matcher: /\/_next\/static\/.*\.js$/,
  handler: isDevelopment
    ? new NetworkOnly()
    : new StaleWhileRevalidate({
        cacheName: CACHE_NAMES.JS,
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
};

const rscCaching: RuntimeCaching = {
  matcher: ({ url }) => url.searchParams.has('_rsc'),
  handler: new NetworkFirst({
    cacheName: CACHE_NAMES.RSC,
    matchOptions: { ignoreVary: true },
    networkTimeoutSeconds: TIMEOUTS.RSC_FETCH / 1000,
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
};

const fontCaching: RuntimeCaching = {
  matcher: /\/_next\/static\/media\/.*\.(woff2?|ttf|otf|eot)$/,
  handler: new CacheFirst({
    cacheName: CACHE_NAMES.FONTS,
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }) as SerwistPlugin,
      new ExpirationPlugin({ maxEntries: 50 }) as SerwistPlugin,
    ],
  }),
};

const nextFontCaching: RuntimeCaching = {
  matcher: /\/__nextjs_font\/.*/,
  handler: new CacheFirst({
    cacheName: CACHE_NAMES.NEXTJS_FONTS,
    plugins: [new CacheableResponsePlugin({ statuses: [200] }) as SerwistPlugin],
  }),
};

const imageCaching: RuntimeCaching = {
  matcher: /\.(png|jpg|jpeg|svg|gif|webp|ico)$/,
  handler: isDevelopment
    ? new NetworkOnly()
    : new StaleWhileRevalidate({
        cacheName: CACHE_NAMES.IMAGES,
        plugins: [new CacheableResponsePlugin({ statuses: [200] }) as SerwistPlugin],
      }),
};

const apiCaching: RuntimeCaching = {
  matcher: /\/api\/.*/,
  handler: new NetworkFirst({
    cacheName: CACHE_NAMES.API,
    networkTimeoutSeconds: TIMEOUTS.DEFAULT_FETCH / 1000,
    plugins: [
      new CacheableResponsePlugin({
        statuses: [200],
      }) as SerwistPlugin,
    ],
  }),
};

const pageCaching: RuntimeCaching = {
  matcher: ({ request }: { request: Request }): boolean => request.destination === 'document',
  handler: new NetworkFirst({
    cacheName: CACHE_NAMES.PAGES,
    networkTimeoutSeconds: TIMEOUTS.DEFAULT_FETCH / 1000,
  }),
};

const runtimeCaching: RuntimeCaching[] = [
  cssCaching,
  jsCaching,
  rscCaching,
  fontCaching,
  nextFontCaching,
  imageCaching,
  apiCaching,
  pageCaching,
  ...offlineRegistry.getRuntimeCaching(),
  ...defaultCache,
];

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
