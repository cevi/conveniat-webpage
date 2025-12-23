import { addOfflineSupportForMapViewer } from '@/features/service-worker/offline-support/map-viewer';
import {
  notificationClickHandler,
  pushNotificationHandler,
} from '@/features/service-worker/push-notifications';
import { defaultCache } from '@serwist/turbopack/worker';
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import { Serwist } from 'serwist';

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

// Initialize Serwist with Turbopack worker defaults
const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST ?? [],
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
  fallbacks: {
    entries: [
      {
        url: '/~offline',
        matcher({ request }) {
          return request.destination === 'document';
        },
      },
    ],
  },
});

// Add map viewer offline support
addOfflineSupportForMapViewer(serwist, crypto.randomUUID());

// push notifications » has nothing to do with serwist
self.addEventListener('push', pushNotificationHandler(self));
self.addEventListener('pushsubscriptionchange', () => {});
self.addEventListener('notificationclick', notificationClickHandler(self));
self.addEventListener('notificationclose', () => {});

// additional event listeners
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
  console.log('Service Worker: Activated and ready to handle requests.');
});

self.addEventListener('fetch', (event) => {
  // Log fetch events for debugging purposes
  console.log(`Service Worker: Fetching ${event.request.url}`);
});

// this should be called after all custom event listeners are registered
serwist.addEventListeners();
