import { DesignModeTriggers } from '@/utils/design-codes';

interface NotificationPayload {
  title: string;
  body: string;
  data: {
    url?: string;
    notificationId?: string;
  };
}

interface NotificationData {
  url?: string;
  notificationId?: string;
}

/**
 * Tracks push notification events (delivery, click, dismiss) via TRPC.
 */
async function trackPushEvent(
  notificationId: string,
  eventType: 'DELIVERED' | 'CLICK' | 'DISMISS',
): Promise<void> {
  const method = eventType === 'DELIVERED' ? 'markDelivered' : 'markInteracted';
  const body =
    eventType === 'DELIVERED' ? { id: notificationId } : { id: notificationId, type: eventType };

  try {
    // here we cannot use the normal trpc bindings because
    // we are in a service worker context
    await fetch(`/api/trpc/pushTracking.${method}?batch=1`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        0: {
          json: body,
        },
      }),
    });
  } catch (error) {
    console.error(`Failed to track push event ${eventType}`, error);
  }
}

/**
 * Checks if any window client is visible.
 */
async function isAppFocused(
  serviceWorkerScope: ServiceWorkerGlobalScope,
): Promise<{ isFocused: boolean; clients: readonly Client[] }> {
  const clientList = await serviceWorkerScope.clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  });

  const isFocused = clientList.some((client) => client.visibilityState === 'visible');
  return { isFocused, clients: clientList };
}

/**
 * Broadcasts the notification data to all connected clients.
 */
function broadcastToClients(clients: readonly Client[], data: NotificationPayload): void {
  for (const client of clients) {
    client.postMessage({
      type: 'notification',
      data,
    });
  }
}

export const pushNotificationHandler =
  (serviceWorkerScope: ServiceWorkerGlobalScope) =>
  (event: PushEvent): void => {
    console.log('Push notification received.');
    if (!event.data) return;

    const data = event.data.json() as NotificationPayload;

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
        const { isFocused, clients } = await isAppFocused(serviceWorkerScope);

        if (isFocused) {
          console.log('App is in focus; skipping notification.');
          broadcastToClients(clients, data);
        } else {
          await serviceWorkerScope.registration.showNotification(data.title, options);
        }

        if (data.data.notificationId) {
          await trackPushEvent(data.data.notificationId, 'DELIVERED');
        }
      })(),
    );
  };

export const notificationClickHandler =
  (serviceWorkerScope: ServiceWorkerGlobalScope) =>
  (event: NotificationEvent): void => {
    console.log('Notification click received.');
    event.notification.close();

    const notificationData = event.notification.data as NotificationData;
    const urlString = notificationData.url ?? '/app/dashboard';

    const url = new URL(urlString, serviceWorkerScope.location.origin);
    url.searchParams.set(DesignModeTriggers.QUERY_PARAM_IMPLICIT, 'true');

    const openWindowPromise = serviceWorkerScope.clients.openWindow(url.toString());

    const trackingPromise = notificationData.notificationId
      ? trackPushEvent(notificationData.notificationId, 'CLICK')
      : Promise.resolve();

    event.waitUntil(Promise.all([openWindowPromise, trackingPromise]));
  };

export function notificationCloseHandler(event: NotificationEvent): void {
  console.log('Notification closed (dismissed).');
  const notificationData = event.notification.data as NotificationData;

  if (notificationData.notificationId) {
    event.waitUntil(trackPushEvent(notificationData.notificationId, 'DISMISS'));
  }
}
