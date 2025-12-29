import {
  addAppModeClient,
  ensureAppModeInitialized,
  persistAppModeClients,
  pruneInactiveAppModeClients,
} from '@/features/service-worker/app-mode';
import { CACHE_NAMES } from '@/features/service-worker/constants';
import { serwist } from '@/features/service-worker/offline-support/caching';
import { handleFetchEvent } from '@/features/service-worker/offline-support/fetch-handler';
import { registerMapOfflineSupport } from '@/features/service-worker/offline-support/map-viewer';
import {
  isOfflineSupportEnabled,
  prefetchOfflinePages,
} from '@/features/service-worker/offline-support/prefetch';
import {
  notificationClickHandler,
  pushNotificationHandler,
} from '@/features/service-worker/push-notifications';
import { ServiceWorkerMessages } from '@/utils/service-worker-messages';

// Register map offline support
registerMapOfflineSupport();

// Ensures the global `self` variable is correctly
// typed as `ServiceWorkerGlobalScope`.
declare const self: ServiceWorkerGlobalScope;

// Push notifications
self.addEventListener('push', pushNotificationHandler(self));
self.addEventListener('pushsubscriptionchange', () => {});
self.addEventListener('notificationclick', notificationClickHandler(self));
self.addEventListener('notificationclose', () => {});

// Service worker lifecycle events
self.addEventListener('install', (event) => {
  event.waitUntil(serwist.handleInstall(event));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async (): Promise<void> => {
      // Standard activation tasks
      await Promise.all([
        serwist.handleActivate(event),
        self.clients.claim(),
        pruneInactiveAppModeClients(self),
      ]);

      // Selective Invalidation (Automated Lifecycle)
      // Only delete caches that are safe to prune (Assets/Fonts/Images are kept!)
      const expectedCaches = new Set<string>(Object.values(CACHE_NAMES));
      const currentCaches = await caches.keys();
      await Promise.all(
        currentCaches.map((cacheName) => {
          if (!expectedCaches.has(cacheName) && !cacheName.includes('precache')) {
            console.log(`[SW] Pruning old cache: ${cacheName}`);
            return caches.delete(cacheName);
          }
          return Promise.resolve(false);
        }),
      );

      // Handle offline cache update if previously enabled
      const offlineEnabled = await isOfflineSupportEnabled();
      if (offlineEnabled) {
        console.log('[SW] Service Worker updated. Flushing and redownloading offline content...');

        // Trigger redownload using reliable Client Claiming
        console.log('[SW] Triggering offline content redownload for all clients...');

        // Wait for control to be active
        await self.clients.claim();

        const clients = await self.clients.matchAll();
        for (const client of clients) {
          client.postMessage({ type: ServiceWorkerMessages.START_OFFLINE_DOWNLOAD });
        }

        // Also trigger internally for the SW itself if needed
        void prefetchOfflinePages();
      }

      console.log('[SW] Activated and ready to handle requests.');
    })(),
  );
});

// Message handler for App Mode and Offline Download
self.addEventListener('message', (event) => {
  const data = event.data as { type?: string } | undefined;

  if (data?.type === 'SET_APP_MODE' && event.source instanceof Client) {
    const clientId = event.source.id;
    event.waitUntil(
      (async (): Promise<void> => {
        await ensureAppModeInitialized();
        addAppModeClient(clientId);
        await persistAppModeClients();
        console.log(`[SW] Client registered for App Mode: ${clientId}`);
      })(),
    );
  }

  if (
    data?.type === ServiceWorkerMessages.START_OFFLINE_DOWNLOAD &&
    event.source instanceof Client
  ) {
    const clientId = event.source.id;
    event.waitUntil(
      (async (): Promise<void> => {
        const client = await self.clients.get(clientId);
        if (!client) return;

        await prefetchOfflinePages(clientId, (total, current) => {
          client.postMessage({
            type: ServiceWorkerMessages.OFFLINE_DOWNLOAD_PROGRESS,
            payload: { total, current },
          });
        });

        client.postMessage({ type: ServiceWorkerMessages.OFFLINE_DOWNLOAD_COMPLETE });
      })(),
    );
  }

  if (data?.type === ServiceWorkerMessages.CHECK_OFFLINE_READY && event.source instanceof Client) {
    const client = event.source;
    event.waitUntil(
      (async (): Promise<void> => {
        const isReady = await isOfflineSupportEnabled();
        client.postMessage({
          type: ServiceWorkerMessages.CHECK_OFFLINE_READY,
          payload: { ready: isReady },
        });
      })(),
    );
  }
});

// Suppress network errors that occur during offline operation.
self.addEventListener('unhandledrejection', (event) => {
  const error: unknown = event.reason;
  if (
    error instanceof Error &&
    ((error.name === 'NetworkError' && error.message.includes('Cache.put')) ||
      (error.name === 'TypeError' && error.message.includes('Failed to fetch')))
  ) {
    event.preventDefault();
    console.debug('[SW] Suppressed network error:', error);
  }
});

// Global fetch listener
self.addEventListener('fetch', handleFetchEvent(serwist));
