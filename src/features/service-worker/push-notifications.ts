import { DesignModeTriggers } from '@/utils/design-codes';

/**
 * Callback function to register the push notification handler.
 * This function is called when a push event is received.
 *
 * @example
 * self.addEventListener('push', registerPushNotificationHandler(self));
 *
 * @param serviceWorkerScope - The service worker global scope.
 *
 */
export const pushNotificationHandler =
  (serviceWorkerScope: ServiceWorkerGlobalScope) =>
  (event: PushEvent): void => {
    console.log('Push notification received.');
    if (!event.data) return;

    const data = event.data.json() as {
      title: string;
      body: string;
      data: {
        url?: string;
      };
    };

    const options: NotificationOptions = {
      body: data.body,
      icon: '/favicon.svg',
      badge: '/notification-icon.png',
      requireInteraction: true,
      tag: 'conveniat27',
      data: data.data,
    };

    event.waitUntil(
      (async (): Promise<void> => {
        const clientList = await serviceWorkerScope.clients.matchAll({
          type: 'window',
          includeUncontrolled: true,
        });

        const isAppInFocus = clientList.some((client) => {
          return client.visibilityState === 'visible';
        });

        if (isAppInFocus) {
          console.log('App is in focus; skipping notification.');

          // send notification to all clients
          for (const client of clientList) {
            client.postMessage({
              type: 'notification',
              data,
            });
          }
        } else {
          await serviceWorkerScope.registration.showNotification(data.title, options);
        }
      })(),
    );
  };

interface NotificationData {
  url?: string;
}

export const notificationClickHandler =
  (serviceWorkerScope: ServiceWorkerGlobalScope) =>
  (event: NotificationEvent): void => {
    console.log('Notification click received.');
    event.notification.close();

    const notificationData = event.notification.data as NotificationData;

    const urlString = notificationData.url || '/app/dashboard';
    const url = new URL(urlString, serviceWorkerScope.location.origin);
    url.searchParams.set(DesignModeTriggers.QUERY_PARAM_IMPLICIT, 'true');

    event.waitUntil(serviceWorkerScope.clients.openWindow(url.toString()));
  };
