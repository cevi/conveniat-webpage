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
  /** The bodies a stacked notification lists, newest first. Set by this worker, not by the server. */
  lines?: string[];
  /** The log ids of the pushes listed in `lines`. Set by this worker, not by the server. */
  ids?: string[];
  /** `emergency` for an alert and every message in its emergency chat. */
  notificationType?: string;
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
async function showUnderTag(
  serviceWorkerScope: ServiceWorkerGlobalScope,
  payload: NotificationPayload,
): Promise<boolean> {
  const { tag, stack, notificationId } = payload.data;
  const hasTag = typeof tag === 'string' && tag !== '';
  const [existing] = hasTag ? await serviceWorkerScope.registration.getNotifications({ tag }) : [];
  const existingData = (existing?.data as NotificationData | undefined) ?? {};

  const options: NotificationOptionsWithRenotify = {
    body: payload.body,
    icon: '/favicon.svg',
    badge: '/notification-icon.png',
    // Only an emergency stays on screen until it is dealt with. With a notification per chat
    // and per announcement, sticky ones would pile up on a desktop and could queue a new
    // emergency behind them.
    requireInteraction: payload.data.notificationType === 'emergency',
    ...(hasTag && { tag }),
    data: payload.data,
  };

  if (stack === true && hasTag) {
    const previousLines = Array.isArray(existingData.lines) ? existingData.lines : [];
    const previousIds = Array.isArray(existingData.ids) ? existingData.ids : [];
    const isRepeat =
      notificationId !== undefined && notificationId !== '' && previousIds.includes(notificationId);

    if (isRepeat) {
      // The queue retries a send that timed out, and the device may have got the first one after
      // all. Show the notification again as it is, in place and without a sound: dropping the
      // push instead would count as a silent push on WebKit.
      options.body = previousLines.join('\n');
      options.data = existingData;
    } else {
      // Newest first: a collapsed notification shows only its first line or so, and that has
      // to be the message that just alerted.
      const lines = [payload.body, ...previousLines].slice(0, MAX_STACKED_LINES);
      const ids = [
        ...(notificationId === undefined || notificationId === '' ? [] : [notificationId]),
        ...previousIds,
      ].slice(0, MAX_STACKED_LINES);
      options.body = lines.join('\n');
      options.data = { ...payload.data, lines, ids };
      // Firefox and Safari ignore renotify and would replace the notification silently, so
      // the old one is closed first and the new one arrives as new, with sound.
      options.renotify = true;
      existing?.close();
    }
  }

  await serviceWorkerScope.registration.showNotification(payload.title, options);
  return true;
}

/** Pushes being shown, per tag. */
const presentationsByTag = new Map<string, Promise<boolean>>();

/**
 * Shows a push, one at a time per tag.
 *
 * Two pushes for the same chat that arrive together would otherwise both read the tray before
 * either shows anything, and the second would replace the first, silently on Firefox and Safari
 * and with the first one's line lost.
 */
function presentNotification(
  serviceWorkerScope: ServiceWorkerGlobalScope,
  payload: NotificationPayload,
): Promise<boolean> {
  const { tag } = payload.data;
  if (typeof tag !== 'string' || tag === '') return showUnderTag(serviceWorkerScope, payload);

  const previous = presentationsByTag.get(tag) ?? Promise.resolve(true);
  const current = previous.catch(() => false).then(() => showUnderTag(serviceWorkerScope, payload));
  presentationsByTag.set(tag, current);
  void current
    .catch(() => false)
    .then(() => {
      if (presentationsByTag.get(tag) === current) presentationsByTag.delete(tag);
    });
  return current;
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
 * How long the service worker waits for the page to take over a tap. The page was just focused,
 * and a phone that wakes it may take a moment before its listeners run.
 */
const PUSH_NAVIGATE_RESPONSE_TIMEOUT_MS = 1000;

/**
 * Strips an optional locale prefix so `/de/app/chat/x` compares equal to `/app/chat/x`.
 */
const normalizePathname = (pathname: string): string =>
  pathname.replace(/^\/(?:de|fr|en)(?=\/|$)/, '');

/**
 * Posts a message with a reply port and resolves with the answer, or with `undefined` when the
 * page does not answer in time, which is how a page without the listener says nothing.
 */
async function requestFromClient(
  client: WindowClient,
  message: Record<string, unknown>,
  timeoutMs: number,
): Promise<unknown> {
  return new Promise((resolve: (answer?: unknown) => void) => {
    try {
      const channel = new MessageChannel();
      const fallback = setTimeout(() => {
        channel.port1.close();
        resolve();
      }, timeoutMs);

      channel.port1.addEventListener('message', (messageEvent: MessageEvent): void => {
        clearTimeout(fallback);
        channel.port1.close();
        resolve(messageEvent.data);
      });
      channel.port1.start();

      client.postMessage(message, [channel.port2]);
    } catch {
      resolve();
    }
  });
}

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
  const answer = await requestFromClient(
    client,
    { type: ServiceWorkerMessages.GET_CLIENT_URL },
    CLIENT_URL_RESPONSE_TIMEOUT_MS,
  );
  const reportedUrl = (answer as { url?: unknown } | undefined)?.url;
  return typeof reportedUrl === 'string' && reportedUrl !== ''
    ? { url: reportedUrl, source: 'live' }
    : { url: client.url, source: 'creation-url-fallback' };
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
 * Reads a push's payload without throwing, so that a push the server sent malformed still reaches
 * the WebKit fallback in {@link handlePush}.
 *
 * @returns the payload, or `undefined` when the push carries none or nothing readable
 */
function readPushPayload(message: PushMessageData | null): NotificationPayload | undefined {
  if (message === null) return undefined;
  let parsed: unknown;
  try {
    parsed = message.json();
  } catch {
    return undefined;
  }
  if (typeof parsed !== 'object' || parsed === null) return undefined;
  const { title, body, data } = parsed as Partial<Record<keyof NotificationPayload, unknown>>;
  return {
    title: typeof title === 'string' ? title : '',
    body: typeof body === 'string' ? body : '',
    data: typeof data === 'object' && data !== null ? data : {},
  };
}

/**
 * Shows a push unless a visible page makes it redundant, and tells the open pages about it.
 *
 * @returns whether a notification is now showing for this push
 */
async function showUnlessSuppressed(
  serviceWorkerScope: ServiceWorkerGlobalScope,
  payload: NotificationPayload,
): Promise<boolean> {
  const { isFocused, clients } = await isAppFocused(serviceWorkerScope);

  // Keep open pages up to date no matter whether a system notification is
  // shown: the pages decide themselves which queries to refresh.
  if (clients.length > 0) {
    broadcastToClients(clients, payload);
  }

  let shouldShowNotification = !isFocused;

  if (isFocused) {
    console.log('[SW Push][WebPush] App is in focus.');

    const ignoreIfAppOpen =
      payload.data.ignoreIfAppOpen === true || payload.data.ignoreIfAppOpen === 'true';
    const ignoreIfUrlMatches =
      payload.data.ignoreIfUrlMatches === true || payload.data.ignoreIfUrlMatches === 'true';
    const targetUrlString = payload.data.url;

    if (ignoreIfAppOpen) {
      shouldShowNotification = false;
      console.log('[SW Push][WebPush] Notification ignored because ignoreIfAppOpen is enabled.');
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

  if (!shouldShowNotification) return false;
  return presentNotification(serviceWorkerScope, payload);
}

/** What WebKit gets shown and closed for a push whose payload could not be read. */
const UNREADABLE_PUSH: NotificationPayload = { title: '', body: '', data: {} };

/**
 * Handles one push. Every path ends with a notification on WebKit, also a push without a
 * readable payload and one whose handling threw, because each push that shows nothing costs a
 * strike there, see {@link revokesSubscriptionOnSilentPush}.
 */
async function handlePush(
  serviceWorkerScope: ServiceWorkerGlobalScope,
  message: PushMessageData | null,
): Promise<void> {
  const payload = readPushPayload(message);
  if (payload === undefined) console.error('[SW Push][WebPush] Push without a readable payload.');

  let isShown = false;
  try {
    if (payload !== undefined) isShown = await showUnlessSuppressed(serviceWorkerScope, payload);
  } catch (error) {
    console.error('[SW Push][WebPush] Failed to handle push.', error);
  }

  if (!isShown && revokesSubscriptionOnSilentPush(serviceWorkerScope)) {
    await showAndCloseSuppressedNotification(serviceWorkerScope, payload ?? UNREADABLE_PUSH);
  }
  // A suppressed push still reached the device, so it is reported as delivered too.
  // Before, it left no trace at all, and a chat the user was reading looked like a
  // push that never arrived.
  const notificationId = payload?.data.notificationId;
  if (notificationId) {
    await trackPushEvent(notificationId, {
      type: 'DELIVERED',
      presentation: isShown ? 'SHOWN' : 'SUPPRESSED',
    });
  }
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
    event.waitUntil(handlePush(serviceWorkerScope, event.data));
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

      // The open app routes a target on this origin itself, a soft navigation that keeps the
      // app loaded. Only a page that does not take the tap over, like the admin panel, or a link
      // to another origin is loaded anew.
      if (isSameOrigin) {
        const answer = await requestFromClient(
          existingClient,
          { type: ServiceWorkerMessages.PUSH_NAVIGATE, payload: { url: targetUrlString } },
          PUSH_NAVIGATE_RESPONSE_TIMEOUT_MS,
        );
        if ((answer as { handled?: unknown } | undefined)?.handled === true) return;
      }

      // navigate() rejects for a client this worker does not control, and then only a new
      // window still gets the reader there.
      try {
        await existingClient.navigate(targetUrlString);
      } catch {
        await serviceWorkerScope.clients.openWindow(targetUrlString);
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
