import { DesignModeTriggers } from '@/utils/design-codes';
import { reportRenewedPushSubscription } from '@/utils/push-notifications/report-renewed-push-subscription';
import { ServiceWorkerMessages } from '@/utils/service-worker-messages';

interface NotificationData {
  url?: string;
  notificationId?: string;
  ignoreIfAppOpen?: boolean | string;
  ignoreIfUrlMatches?: boolean | string;
  /** Replaces the notification already shown under the same tag. Without one, every push stands alone. */
  tag?: string;
  /** Lists the newest pushes under the tag in one notification and alerts again, like a messenger. */
  stack?: boolean;
  /** Updates the notification under the tag without alerting, and shows nothing once it was dismissed. */
  replaceOnly?: boolean;
  /** The bodies a stacked notification lists, oldest first. Set by this worker, not by the server. */
  lines?: string[];
}

interface NotificationPayload {
  title: string;
  body: string;
  data: NotificationData;
}

/**
 * Chrome's options type lost `renotify` because Firefox and Safari never implemented it, but
 * Chrome still honours it.
 */
interface NotificationOptionsWithRenotify extends NotificationOptions {
  renotify?: boolean;
}

/** A stacked chat notification lists at most this many of the newest messages. */
const MAX_STACKED_LINES = 5;

/**
 * Shows a push, taking into account what is already on screen under its tag.
 *
 * @returns whether a notification is now showing for this push
 */
async function presentNotification(
  serviceWorkerScope: ServiceWorkerGlobalScope,
  payload: NotificationPayload,
): Promise<boolean> {
  const { tag, stack, replaceOnly } = payload.data;
  const hasTag = typeof tag === 'string' && tag !== '';
  const [existing] = hasTag ? await serviceWorkerScope.registration.getNotifications({ tag }) : [];
  const existingData = (existing?.data as NotificationData | undefined) ?? {};

  const options: NotificationOptionsWithRenotify = {
    body: payload.body,
    icon: '/favicon.svg',
    badge: '/notification-icon.png',
    requireInteraction: true,
    ...(hasTag && { tag }),
    data: payload.data,
  };

  if (replaceOnly === true) {
    // An edit must not bring back what the reader already dismissed.
    if (existing === undefined) return false;
    // Same tag and no renotify: the browser swaps the content in without a sound. The edit
    // carries no log id of its own, so a click still counts for the push that was delivered.
    options.data = {
      ...existingData,
      ...payload.data,
      notificationId: existingData.notificationId,
    };
  } else if (stack === true && hasTag) {
    const previousLines = Array.isArray(existingData.lines) ? existingData.lines : [];
    const lines = [...previousLines, payload.body].slice(-MAX_STACKED_LINES);
    options.body = lines.join('\n');
    options.data = { ...payload.data, lines };
    // Firefox and Safari ignore renotify and would replace the notification silently, so
    // the old one is closed first and the new one arrives as new, with sound.
    options.renotify = true;
    existing?.close();
  }

  await serviceWorkerScope.registration.showNotification(payload.title, options);
  return true;
}

type PushTrackingEvent =
  { type: 'DELIVERED'; presentation: 'SHOWN' | 'SUPPRESSED' } | { type: 'CLICK' | 'DISMISS' };

/**
 * Tracks push notification events (delivery, click, dismiss) via TRPC.
 */
async function trackPushEvent(notificationId: string, event: PushTrackingEvent): Promise<void> {
  const method = event.type === 'DELIVERED' ? 'markDelivered' : 'markInteracted';
  const body =
    event.type === 'DELIVERED'
      ? { id: notificationId, presentation: event.presentation }
      : { id: notificationId, type: event.type };

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
    console.error(`Failed to track push event ${event.type}`, error);
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

/** Kept apart from the chat and announcement tags, so closing it cannot close a notification the user still sees. */
const SUPPRESSED_NOTIFICATION_TAG = 'conveniat27-suppressed';

/**
 * WebKit counts every push that does not call `showNotification` within 30 seconds. After the
 * third, it removes every push subscription of the origin. The count never resets, and a visible
 * app is no exemption, so three suppressed chat pushes silence an iPhone for good. Chrome and
 * Firefox exempt a push that arrives while a page of the origin is visible.
 */
const revokesSubscriptionOnSilentPush = (serviceWorkerScope: ServiceWorkerGlobalScope): boolean => {
  const { userAgent } = serviceWorkerScope.navigator;
  return userAgent.includes('AppleWebKit') && !/Chrome|Chromium/.test(userAgent);
};

/**
 * Satisfies WebKit's silent push rule for a push the user should not see: the notification is
 * shown silently and closed straight away. WebKit counts the push as shown once the request is
 * added, however briefly it stays.
 */
async function showAndCloseSuppressedNotification(
  serviceWorkerScope: ServiceWorkerGlobalScope,
  data: NotificationPayload,
): Promise<void> {
  const { registration } = serviceWorkerScope;
  await registration.showNotification(data.title, {
    body: data.body,
    icon: '/favicon.svg',
    badge: '/notification-icon.png',
    tag: SUPPRESSED_NOTIFICATION_TAG,
    silent: true,
  });
  const shownNotifications = await registration.getNotifications({
    tag: SUPPRESSED_NOTIFICATION_TAG,
  });
  for (const notification of shownNotifications) notification.close();
}

/**
 * Handles incoming push notifications (Web Push transport — native FCM pushes
 * never reach this service worker handler).
 * Displays notifications by default (including test notifications sent from admin panel
 * and subscription confirmation push notifications).
 * Only suppresses notifications if `ignoreIfAppOpen` is true or if `ignoreIfUrlMatches`
 * matches the URL a visible client is currently showing. On WebKit a suppressed notification is
 * still shown and closed at once, see {@link revokesSubscriptionOnSilentPush}.
 */
export const pushNotificationHandler =
  (serviceWorkerScope: ServiceWorkerGlobalScope) =>
  (event: PushEvent): void => {
    console.log('[SW Push][WebPush] Push notification received.');
    if (!event.data) return;

    const data = event.data.json() as NotificationPayload;

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

        // An update only touches a notification that is still on screen, so it applies
        // whether or not the app is open.
        let isShown = false;
        if (shouldShowNotification || data.data.replaceOnly === true) {
          isShown = await presentNotification(serviceWorkerScope, data);
        }
        if (!isShown && revokesSubscriptionOnSilentPush(serviceWorkerScope)) {
          await showAndCloseSuppressedNotification(serviceWorkerScope, data);
        }
        // A suppressed push still reached the device, so it is reported as delivered too.
        // Before, it left no trace at all, and a chat the user was reading looked like a
        // push that never arrived. A quiet update carries no id of its own.
        if (data.data.notificationId) {
          await trackPushEvent(data.data.notificationId, {
            type: 'DELIVERED',
            presentation: isShown ? 'SHOWN' : 'SUPPRESSED',
          });
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
    // A link to another origin, like the short domain con27.ch, has to be opened as it is.
    // The page behind PUSH_NAVIGATE routes within this origin and keeps only the path, which
    // turned https://con27.ch/agbs into a 404 at /agbs. con27.ch answers with an absolute
    // redirect to this origin, so the reader still ends up here.
    const isSameOrigin = url.origin === serviceWorkerScope.location.origin;
    if (isSameOrigin) {
      url.searchParams.set(DesignModeTriggers.QUERY_PARAM_IMPLICIT, 'true');
    }
    const targetUrlString = url.toString();

    const trackingPromise = notificationData.notificationId
      ? trackPushEvent(notificationData.notificationId, { type: 'CLICK' })
      : Promise.resolve();

    const openOrFocusPromise = (async (): Promise<void> => {
      const clientList = await serviceWorkerScope.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      const existingClient =
        clientList.find((client) => client.visibilityState === 'visible') ?? clientList[0];

      if (!existingClient) {
        await serviceWorkerScope.clients.openWindow(targetUrlString);
        return;
      }

      await existingClient.focus();

      // Relayed to PostHog by the page, see `PostHogProvider`. A window opened above has no
      // PostHog running yet when the message arrives, so only a tap into an open app counts.
      existingClient.postMessage({
        type: ServiceWorkerMessages.CAPTURE_POSTHOG_EVENT,
        payload: { event: 'push_notification_opened', properties: { channel: 'web' } },
      });

      if (!isSameOrigin) {
        // navigate() rejects for a client this worker does not control, and then only a new
        // window still gets the reader there.
        try {
          await existingClient.navigate(targetUrlString);
        } catch {
          await serviceWorkerScope.clients.openWindow(targetUrlString);
        }
        return;
      }

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
    })();

    event.waitUntil(Promise.all([openOrFocusPromise, trackingPromise]));
  };

/** `lib.webworker` types this event as a plain `Event`; these are its fields per the Push API. */
interface PushSubscriptionChangeEvent extends ExtendableEvent {
  readonly oldSubscription?: PushSubscription | null;
  readonly newSubscription?: PushSubscription | null;
}

/**
 * Reports a subscription the browser replaced on its own. Without the report, every later
 * push goes to an endpoint that answers 410, the server prunes the row, and the device stays
 * silent until someone switches notifications off and on again.
 *
 * Firefox fires this when its push service drops a subscription, with the old one set and no
 * new one, so the worker subscribes again with the old options. Without an old subscription
 * there is no stored row to match, and the change waits for the next subscribe from the page.
 */
export const pushSubscriptionChangeHandler =
  (serviceWorkerScope: ServiceWorkerGlobalScope) =>
  (event: Event): void => {
    const changeEvent = event as PushSubscriptionChangeEvent;
    const { oldSubscription, newSubscription } = changeEvent;
    if (!oldSubscription) {
      console.warn('[SW Push] Subscription changed without the old one, nothing to renew.');
      return;
    }

    changeEvent.waitUntil(
      (async (): Promise<void> => {
        const renewedSubscription =
          newSubscription ??
          (await serviceWorkerScope.registration.pushManager.subscribe(oldSubscription.options));
        await reportRenewedPushSubscription(oldSubscription.toJSON(), renewedSubscription.toJSON());
      })().catch((error: unknown) => {
        console.error('[SW Push] Failed to renew the push subscription', error);
      }),
    );
  };

export function notificationCloseHandler(event: NotificationEvent): void {
  console.log('Notification closed (dismissed).');
  const notificationData = event.notification.data as NotificationData;

  if (notificationData.notificationId) {
    event.waitUntil(trackPushEvent(notificationData.notificationId, { type: 'DISMISS' }));
  }
}
