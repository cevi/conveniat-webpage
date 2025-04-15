import { PrecacheEntry, RouteHandler, Serwist } from 'serwist';
import { defaultCache } from '@serwist/next/worker';

/**
 * Serwist factory function.
 *
 * @param self - The service worker global scope.
 */
const serwistFactory = (self: ServiceWorkerGlobalScope): Serwist => {
  return new Serwist({
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
 * @param serviceWorkerScope
 */
export const offlineSupportInstallHandler =
  (serviceWorkerScope: ServiceWorkerGlobalScope) =>
  (event: ExtendableEvent): void => {
    const serwist = serwistFactory(serviceWorkerScope);
    serwist.setCatchHandler(serwistRouteCatchHandler);
    serwist.addEventListeners();

    const requestPromises = Promise.all(
      ['/offline'].map((entry) => {
        return serwist.handleRequest({ request: new Request(entry), event });
      }),
    );
    event.waitUntil(requestPromises);
  };
