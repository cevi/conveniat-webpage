import { environmentVariables } from '@/config/environment-variables';

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
    if (event.data) {
      // TODO: is this type correct?
      const data = event.data.json() as {
        title: string;
        body: string;
      };
      const options: NotificationOptions = {
        body: data.body,
        icon: '/favicon.svg',
        badge: '/favicon.svg',
        requireInteraction: true,
        tag: 'conveniat27',
        data: {},
      };

      event.waitUntil(serviceWorkerScope.registration.showNotification(data.title, options));
    }
  };

export const notificationClickHandler =
  (serviceWorkerScope: ServiceWorkerGlobalScope) =>
  (event: NotificationEvent): void => {
    console.log('Notification click received.');
    event.notification.close();
    event.waitUntil(
      serviceWorkerScope.clients.openWindow(environmentVariables.NEXT_PUBLIC_APP_HOST_URL),
    );
  };
