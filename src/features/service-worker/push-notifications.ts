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
          return (client as WindowClient).visibilityState === 'visible';
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

    const urlToOpen =
      notificationData.url || (process.env['NEXT_PUBLIC_APP_HOST_URL'] ?? 'https://conveniat27.ch');

    event.waitUntil(serviceWorkerScope.clients.openWindow(urlToOpen));
  };
