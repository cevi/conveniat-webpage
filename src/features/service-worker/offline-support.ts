import type { PrecacheEntry, RouteHandler } from 'serwist';
import { Serwist } from 'serwist';
import { defaultCache } from '@serwist/next/worker';

/**
 * Serwist factory function.
 *
 * @param precacheEntries - The service worker global scope.
 *
 */
const serwistFactory = (precacheEntries: (string | PrecacheEntry)[] | undefined): Serwist => {
  return new Serwist({
    precacheEntries: precacheEntries ?? [],
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
};

/**
 * If a Route throws an error while handling a request,
 * this handler will be called and given a chance to provide a response.
 *
 * @param request
 */
const serwistRouteCatchHandler: RouteHandler = async ({ request }) => {
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
};

/**
 * Callback function to register the offline support handler.
 *
 * @param precacheEntries - The entries to be precached.
 */
export const offlineSupportInstallHandler =
  (precacheEntries: (string | PrecacheEntry)[] | undefined) =>
  (event: ExtendableEvent): void => {
    const serwist = serwistFactory(precacheEntries);
    serwist.setCatchHandler(serwistRouteCatchHandler);
    serwist.addEventListeners();

    const requestPromises = Promise.all(
      ['/offline'].map((entry) => {
        return serwist.handleRequest({ request: new Request(entry), event });
      }),
    );
    event.waitUntil(requestPromises);
  };
