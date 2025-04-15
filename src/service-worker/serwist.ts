import { PrecacheEntry, Serwist } from 'serwist';
import { defaultCache } from '@serwist/next/worker';

/**
 * Serwist factory function.
 *
 * @param self - The service worker global scope.
 */
export const serwistFactory = (self: ServiceWorkerGlobalScope): Serwist => {
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
