import { defaultCache } from '@serwist/next/worker';
import { PrecacheEntry, Serwist, SerwistGlobalConfig } from 'serwist';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    // Change this attribute's name to your `injectionPoint`.
    // `injectionPoint` is an InjectManifest option.
    // See https://serwist.pages.dev/docs/build/configuring
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST as (string | PrecacheEntry)[],
  precacheOptions: {
    cleanupOutdatedCaches: true,
    concurrency: 10,
    ignoreURLParametersMatching: [],
  },
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

self.addEventListener('install', (event) => {
  const requestPromises = Promise.all(
    ['/offline'].map((entry) => {
      return serwist.handleRequest({ request: new Request(entry), event });
    }),
  );
  event.waitUntil(requestPromises);
});

serwist.setCatchHandler(async ({ request }) => {
  switch (request.destination) {
    case 'document': {
      const offlinePage = await caches.match('/offline', {
        ignoreSearch: true,
      });
      return offlinePage ?? Response.error();
    }
    default: {
      return Response.error();
    }
  }
});

serwist.addEventListeners();
