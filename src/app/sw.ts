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

self.addEventListener('push', function (event: PushEvent) {
  if (event.data) {
    // TODO: is this type correct?
    const data = event.data.json() as {
      title: string;
      body: string;
      icon?: string;
    };
    const options = {
      body: data.body,
      icon: data.icon ?? '/icon.png',
      badge: '/badge.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: '2',
      },
    };

    event.waitUntil(self.registration.showNotification(data.title, options));
  }
});

self.addEventListener('notificationclick', function (event) {
  console.log('Notification click received.');
  event.notification.close();
  // TODO: fix types here
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-argument,@typescript-eslint/no-unsafe-call
  event.waitUntil(clients.openWindow(process.env.NEXT_PUBLIC_APP_HOST_URL));
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
