import {
  addAppModeClient,
  ensureAppModeInitialized,
  persistAppModeClients,
  pruneInactiveAppModeClients,
} from '@/features/service-worker/app-mode';
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

// Ensures the global `self` variable is correctly typed as `ServiceWorkerGlobalScope`.
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

      // Handle offline cache update if previously enabled
      const offlineEnabled = await isOfflineSupportEnabled();
      if (offlineEnabled) {
        console.log('[SW] Service Worker updated. Flushing and redownloading offline content...');

        // 1. Delete relevant runtime caches
        const cachesToFlush = [
          'pages-cache',
          'next-rsc-cache',
          'next-css-cache',
          'next-js-cache',
          'images-cache',
          'offline-assets-cache',
        ];

        await Promise.all(cachesToFlush.map((cacheName) => caches.delete(cacheName)));

        // 2. Trigger redownload using existing prefetch logic
        // We trigger it for all clients on the next tick to ensure they are ready
        console.log('[SW] Triggering offline content redownload for all clients...');
        setTimeout(() => {
          void (async (): Promise<void> => {
            const clients = await self.clients.matchAll();
            const mainClient = clients[0];
            await prefetchOfflinePages(mainClient?.id);
          })();
        }, 1000);
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
