import { DesignModeTriggers } from '@/utils/design-codes';
import { ServiceWorkerMessages } from '@/utils/service-worker-messages';

interface NotificationPayload {
  title: string;
  body: string;
  data: {
    url?: string;
    notificationId?: string;
    ignoreIfAppOpen?: boolean | string;
    ignoreIfUrlMatches?: boolean | string;
  };
}

interface NotificationData {
  url?: string;
  notificationId?: string;
  ignoreIfAppOpen?: boolean | string;
  ignoreIfUrlMatches?: boolean | string;
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
): Promise<{ isFocused: boolean; clients: readonly WindowClient[] }> {
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

/**
 * Handles incoming push notifications.
 * Displays notifications by default (including test notifications sent from admin panel
 * and subscription confirmation push notifications).
 * Only suppresses notifications if `ignoreIfAppOpen` is true or if `ignoreIfUrlMatches`
 * matches the currently open active client URL.
 */
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

        let shouldShowNotification = !isFocused;

        if (isFocused) {
          console.log('App is in focus.');

          const ignoreIfAppOpen =
            data.data.ignoreIfAppOpen === true || data.data.ignoreIfAppOpen === 'true';
          const ignoreIfUrlMatches =
            data.data.ignoreIfUrlMatches === true || data.data.ignoreIfUrlMatches === 'true';
          const targetUrlString = data.data.url;

          if (ignoreIfAppOpen) {
            shouldShowNotification = false;
            console.log('Notification ignored because ignoreIfAppOpen is enabled.');
          } else if (ignoreIfUrlMatches && targetUrlString) {
            const normalizePathname = (pathname: string): string =>
              pathname.replace(/^\/(?:de|fr|en)(?:\/[^/]+)?(?=\/|$)/, '');

            const hasMatchingActiveClient = clients.some((client) => {
              if (client.visibilityState !== 'visible') return false;
              try {
                const clientUrl = new URL(client.url);
                const targetUrl = new URL(targetUrlString, serviceWorkerScope.location.origin);
                return (
                  normalizePathname(clientUrl.pathname) === normalizePathname(targetUrl.pathname)
                );
              } catch {
                return false;
              }
            });
            if (hasMatchingActiveClient) {
              shouldShowNotification = false;
              console.log('Notification ignored because user has the matching page open.');
            } else {
              shouldShowNotification = true;
              console.log('Notification shown because matching page is not open.');
            }
          } else {
            shouldShowNotification = true;
            console.log('Notification shown by default when app is in focus.');
          }

          if (!shouldShowNotification) {
            broadcastToClients(clients, data);
          }
        }

        if (shouldShowNotification) {
          await serviceWorkerScope.registration.showNotification(data.title, options);
          if (data.data.notificationId) {
            await trackPushEvent(data.data.notificationId, 'DELIVERED');
          }
        }
      })(),
    );
  };

export const notificationClickHandler =
  (serviceWorkerScope: ServiceWorkerGlobalScope) =>
  (event: NotificationEvent): void => {
    console.log('Notification click received.');
    event.notification.close();

    const notificationData =
      (event.notification.data as (NotificationData & Record<string, unknown>) | undefined) ?? {};
    const pathValue = notificationData['path'];
    const linkValue = notificationData['link'];
    const chatIdValue = notificationData['chatId'];

    const rawUrlString =
      notificationData.url ??
      (typeof pathValue === 'string' ? pathValue : undefined) ??
      (typeof linkValue === 'string' ? linkValue : undefined) ??
      (typeof chatIdValue === 'string' || typeof chatIdValue === 'number'
        ? `/app/chat/${String(chatIdValue)}`
        : undefined);
    const urlString =
      typeof rawUrlString === 'string' && rawUrlString.trim() !== ''
        ? rawUrlString.trim()
        : '/app/dashboard';

    const url = new URL(urlString, serviceWorkerScope.location.origin);
    url.searchParams.set(DesignModeTriggers.QUERY_PARAM_IMPLICIT, 'true');
    const targetUrlString = url.toString();

    const trackingPromise = notificationData.notificationId
      ? trackPushEvent(notificationData.notificationId, 'CLICK')
      : Promise.resolve();

    const openOrFocusPromise = (async (): Promise<void> => {
      const clientList = await serviceWorkerScope.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      const existingClient =
        clientList.find((client) => client.visibilityState === 'visible') ?? clientList[0];

      if (existingClient) {
        await existingClient.focus();
        existingClient.postMessage({
          type: ServiceWorkerMessages.PUSH_NAVIGATE,
          payload: { url: targetUrlString },
        });
        if ('navigate' in existingClient && typeof existingClient.navigate === 'function') {
          try {
            await existingClient.navigate(targetUrlString);
          } catch {
            // navigation handled by PUSH_NAVIGATE postMessage
          }
        }
      } else {
        await serviceWorkerScope.clients.openWindow(targetUrlString);
      }
    })();

    event.waitUntil(Promise.all([openOrFocusPromise, trackingPromise]));
  };

export function notificationCloseHandler(event: NotificationEvent): void {
  console.log('Notification closed (dismissed).');
  const notificationData = event.notification.data as NotificationData;

  if (notificationData.notificationId) {
    event.waitUntil(trackPushEvent(notificationData.notificationId, 'DISMISS'));
  }
}
