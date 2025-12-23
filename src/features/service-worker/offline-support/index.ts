import { addOfflineSupportForMapViewer } from '@/features/service-worker/offline-support/map-viewer';
import { defaultCache } from '@serwist/turbopack/worker';
import type { PrecacheEntry } from 'serwist';
import { Serwist } from 'serwist';

/**
 * Filters out unwanted entries from the precache list.
 * @param precacheEntries
 */
const filterPreCacheEntries = (
  precacheEntries: (string | PrecacheEntry)[],
): (string | PrecacheEntry)[] => {
  const unwantedPrefixes = [
    // those are only used in the admin panel,
    // we don't have offline support for the admin panel
    '/admin-block-images/',

    // don't cache any documents (to avoid caching large files)
    '/api/documents/',
  ];

  return precacheEntries.filter((entry): boolean => {
    if (typeof entry === 'string')
      return !unwantedPrefixes.some((prefix) => entry.startsWith(prefix));
    return !unwantedPrefixes.some((prefix) => entry.url.startsWith(prefix));
  });
};

/**
 * Factory function to create a Serwist instance with offline support.
 * This function initializes the Serwist service worker with
 * precache entries and configuration options.
 *
 * @param precacheEntries
 * @param enablePrecaching
 */
export const serwistFactory = (
  precacheEntries: (string | PrecacheEntry)[],
  enablePrecaching: boolean,
): Serwist => {
  const serwist = new Serwist({
    precacheEntries: enablePrecaching ? filterPreCacheEntries(precacheEntries) : [],
    skipWaiting: true,
    clientsClaim: true,
    navigationPreload: true,
    runtimeCaching: defaultCache,
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

  const revisionUuid = crypto.randomUUID();
  serwist.addToPrecacheList([{ url: '/~offline', revision: revisionUuid }]);

  if (!enablePrecaching) {
    console.warn('Service Worker: Offline support is disabled. Limited offline functionality.');
    return serwist;
  }

  addOfflineSupportForMapViewer(serwist, revisionUuid);

  console.log(
    `Service Worker: Initializing with ${serwist.getPrecachedUrls().length} precache entries.`,
  );

  return serwist;
};
