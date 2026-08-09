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

/** How long the service worker waits for a page to report its current URL. */
const CLIENT_URL_RESPONSE_TIMEOUT_MS = 400;

/**
 * Strips an optional locale prefix so `/de/app/chat/x` compares equal to `/app/chat/x`.
 */
const normalizePathname = (pathname: string): string =>
  pathname.replace(/^\/(?:de|fr|en)(?=\/|$)/, '');

/**
 * Resolves the client's *current* URL via a MessageChannel round-trip.
 *
 * `WindowClient.url` is the document's creation URL: it does NOT reflect
 * client-side (SPA) navigations, so a client that loaded on `/app/chat/<id>`
 * and then navigated to `/app/chat` still reports the old chat URL. The page
 * answers the `GET_CLIENT_URL` message with its live `location.href`; if it
 * does not answer in time we fall back to the (possibly stale) creation URL.
 */
async function getLiveClientUrl(
  client: WindowClient,
): Promise<{ url: string; source: 'live' | 'creation-url-fallback' }> {
  return new Promise((resolve) => {
    let channel: MessageChannel;
    try {
      channel = new MessageChannel();
      const fallback = setTimeout(() => {
        channel.port1.close();
        resolve({ url: client.url, source: 'creation-url-fallback' });
      }, CLIENT_URL_RESPONSE_TIMEOUT_MS);

      channel.port1.addEventListener('message', (messageEvent: MessageEvent): void => {
        clearTimeout(fallback);
        channel.port1.close();
        const reportedUrl = (messageEvent.data as { url?: unknown } | undefined)?.url;
        resolve(
          typeof reportedUrl === 'string' && reportedUrl !== ''
            ? { url: reportedUrl, source: 'live' }
            : { url: client.url, source: 'creation-url-fallback' },
        );
      });
      channel.port1.start();

      client.postMessage({ type: ServiceWorkerMessages.GET_CLIENT_URL }, [channel.port2]);
    } catch {
      resolve({ url: client.url, source: 'creation-url-fallback' });
    }
  });
}

/**
 * Whether a client URL counts as "the user is looking at the notification target".
 *
 * Matches when the (locale-stripped) target pathname is contained in the client's
 * pathname, so sub-routes of a chat (details, threads) still count as open, while
 * the chat overview `/app/chat` does NOT match a chat thread `/app/chat/<id>`.
 *
 * The admin chat management views (e.g. `/admin/globals/alert-management`) show a
 * chat via the `selectedChatId` query parameter instead of an `/app/chat/<id>`
 * pathname, so a client with `?selectedChatId=<id>` also counts as having the
 * chat `<id>` open.
 */
function clientUrlMatchesTarget(clientUrlString: string, targetUrl: URL): boolean {
  const clientUrl = new URL(clientUrlString);
  const clientPathname = normalizePathname(clientUrl.pathname);
  const targetPathname = normalizePathname(targetUrl.pathname);
  if (clientPathname === targetPathname || clientPathname.includes(targetPathname)) {
    return true;
  }

  const selectedChatId = clientUrl.searchParams.get('selectedChatId');
  if (selectedChatId !== null && selectedChatId !== '') {
    const targetChatId = /\/app\/chat\/([^/?]+)/.exec(targetPathname)?.[1];
    return targetChatId === selectedChatId;
  }

  return false;
}

/**
 * Handles incoming push notifications (Web Push transport — native FCM pushes
 * never reach this service worker handler).
 * Displays notifications by default (including test notifications sent from admin panel
 * and subscription confirmation push notifications).
 * Only suppresses notifications if `ignoreIfAppOpen` is true or if `ignoreIfUrlMatches`
 * matches the URL a visible client is currently showing.
 */
export const pushNotificationHandler =
  (serviceWorkerScope: ServiceWorkerGlobalScope) =>
  (event: PushEvent): void => {
    console.log('[SW Push][WebPush] Push notification received.');
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

        // Keep open pages up to date no matter whether a system notification is
        // shown: the pages decide themselves which queries to refresh.
        if (clients.length > 0) {
          broadcastToClients(clients, data);
        }

        let shouldShowNotification = !isFocused;

        if (isFocused) {
          console.log('[SW Push][WebPush] App is in focus.');

          const ignoreIfAppOpen =
            data.data.ignoreIfAppOpen === true || data.data.ignoreIfAppOpen === 'true';
          const ignoreIfUrlMatches =
            data.data.ignoreIfUrlMatches === true || data.data.ignoreIfUrlMatches === 'true';
          const targetUrlString = data.data.url;

          if (ignoreIfAppOpen) {
            shouldShowNotification = false;
            console.log(
              '[SW Push][WebPush] Notification ignored because ignoreIfAppOpen is enabled.',
            );
          } else if (ignoreIfUrlMatches && targetUrlString) {
            const targetUrl = new URL(targetUrlString, serviceWorkerScope.location.origin);
            const visibleClients = clients.filter((client) => client.visibilityState === 'visible');
            const liveClientUrls = await Promise.all(
              visibleClients.map((client) => getLiveClientUrl(client)),
            );

            const hasMatchingActiveClient = liveClientUrls.some(({ url, source }) => {
              let matches = false;
              try {
                matches = clientUrlMatchesTarget(url, targetUrl);
              } catch {
                matches = false;
              }
              console.log(
                `[SW Push][WebPush] URL check: expected="${targetUrl.href}" actual="${url}" (${
                  source === 'live' ? 'reported by page' : 'stale creation URL, page did not answer'
                }) -> ${matches ? 'MATCH' : 'no match'}`,
              );
              return matches;
            });

            if (hasMatchingActiveClient) {
              shouldShowNotification = false;
              console.log(
                `[SW Push][WebPush] Notification ignored: user has the target page "${targetUrl.pathname}" open.`,
              );
            } else {
              shouldShowNotification = true;
              console.log(
                `[SW Push][WebPush] Notification shown: no visible client is on the target page "${targetUrl.pathname}".`,
              );
            }
          } else {
            shouldShowNotification = true;
            console.log('[SW Push][WebPush] Notification shown by default when app is in focus.');
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
