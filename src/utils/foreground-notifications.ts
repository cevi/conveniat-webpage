'use client';

import type { Locale, StaticTranslationString } from '@/types/types';
import { isNativeAppWebView } from '@/utils/standalone-check';
import { toast } from 'sonner';

/**
 * Foreground notification delivery for the native app WebView.
 *
 * ## Why this exists
 *
 * FCM only renders a notification through the operating system while the app is
 * in the *background*. As soon as the native shell is in the foreground, Firebase
 * routes the message to the app's `onMessage` handler instead, and the shell
 * forwards it into the WebView as a `native-push-message` bridge event. Nothing
 * is displayed by the OS in that case.
 *
 * The WebView cannot close that gap on its own: neither the `Notification`
 * constructor nor `navigator.serviceWorker` exist inside an Android WebView or
 * WKWebView, so the previous `new Notification(...)` fallback was dead code and
 * users saw nothing at all while the app was open.
 *
 * ## What this module does
 *
 * 1. If the native shell exposes `AppWebViewNativePush.showNotification(...)`, we
 *    hand the notification to the shell, which renders a real system notification
 *    (WhatsApp-style) even though the app is in the foreground.
 * 2. Otherwise we render an in-app banner so the user is at least informed while
 *    the app is open.
 *
 * Both paths are driven by *either* delivery channel — the FCM foreground bridge
 * event or the realtime SSE stream — and de-duplicated by message id, so a
 * message that arrives over both channels is only surfaced once.
 *
 * Browser clients are intentionally excluded: there the service worker
 * (`src/features/service-worker/push-notifications.ts`) already decides whether
 * to display a notification, and notifying here as well would double up.
 */

/** Number of remembered notification keys used to de-duplicate SSE vs. push delivery. */
const DEDUPLICATION_CACHE_SIZE = 200;

const openActionLabel: StaticTranslationString = {
  de: 'Öffnen',
  en: 'Open',
  fr: 'Ouvrir',
};

const defaultNotificationTitle: StaticTranslationString = {
  de: 'Neue Nachricht',
  en: 'New message',
  fr: 'Nouveau message',
};

export interface ForegroundNotification {
  /** Chat the notification belongs to, when it is a chat message. */
  chatId?: string | undefined;
  /** Stable message id, used to de-duplicate SSE and push delivery of the same message. */
  messageId?: string | undefined;
  title: string;
  body: string;
  /** In-app path opened when the user interacts with the notification. */
  targetPath: string;
  /** Routes the native notification to the siren channel/sound. See issue #47. */
  notificationType?: 'emergency' | undefined;
}

const notifiedKeys = new Set<string>();
const notifiedKeyOrder: string[] = [];

let navigateHandler: ((path: string) => void) | undefined;

/**
 * Registers the client-side router used when the user taps a foreground
 * notification. Falls back to a hard navigation when no handler is registered.
 */
export const setForegroundNotificationNavigator = (
  navigate: ((path: string) => void) | undefined,
): void => {
  navigateHandler = navigate;
};

/** Exposed for tests: clears the de-duplication cache between cases. */
export const resetForegroundNotificationState = (): void => {
  notifiedKeys.clear();
  notifiedKeyOrder.length = 0;
  navigateHandler = undefined;
};

/**
 * Records a notification key and reports whether it is new.
 * Keeps a bounded FIFO window so long chat sessions cannot grow unbounded.
 */
const registerNotificationKey = (key: string): boolean => {
  if (notifiedKeys.has(key)) return false;

  notifiedKeys.add(key);
  notifiedKeyOrder.push(key);

  while (notifiedKeyOrder.length > DEDUPLICATION_CACHE_SIZE) {
    const oldestKey = notifiedKeyOrder.shift();
    if (oldestKey !== undefined) notifiedKeys.delete(oldestKey);
  }

  return true;
};

/** Best-effort locale detection for code that runs outside the React tree. */
export const getDocumentLocale = (): Locale => {
  if (typeof document === 'undefined') return 'de';

  const documentLanguage = document.documentElement.lang;
  if (documentLanguage === 'en' || documentLanguage === 'fr' || documentLanguage === 'de') {
    return documentLanguage;
  }
  return 'de';
};

/**
 * Whether the user currently has the target of the notification on screen.
 *
 * Comparison is suffix based because the visible pathname carries a locale and,
 * depending on the design code, an extra route segment (`/de/app/chat/x`), while
 * notification targets are always stored unprefixed (`/app/chat/x`).
 * A chat counts as open for every sub-route (details, threads, …) of that chat.
 */
export const isNotificationTargetVisible = (
  chatId: string | undefined,
  targetPath: string,
): boolean => {
  // Guarded cast: the module is client-only, but it must stay inert if it is ever
  // evaluated in a non-browser context.
  const currentLocation = globalThis.location as Location | undefined;
  if (currentLocation === undefined) return false;

  const currentPathname = currentLocation.pathname;

  if (typeof chatId === 'string' && chatId.trim() !== '') {
    return currentPathname.includes(`/app/chat/${chatId.trim()}`);
  }

  const targetPathname = targetPath.split('?')[0] ?? targetPath;
  return targetPathname !== '' && currentPathname.endsWith(targetPathname);
};

/**
 * Asks the native shell to render a real system notification.
 * Returns `false` when the installed app build does not support the command yet,
 * so the caller can fall back to the in-app banner.
 */
const requestNativeSystemNotification = (notification: ForegroundNotification): boolean => {
  const bridge = globalThis.AppWebViewNativePush as Record<string, unknown> | undefined;
  if (!bridge) return false;

  const showNotification = bridge['showNotification'];
  if (typeof showNotification !== 'function') return false;

  try {
    (showNotification as (request: Record<string, string>) => void)({
      title: notification.title,
      body: notification.body,
      url: notification.targetPath,
      ...(notification.chatId !== undefined && { chatId: notification.chatId }),
      ...(notification.messageId !== undefined && { messageId: notification.messageId }),
      ...(notification.notificationType !== undefined && {
        notificationType: notification.notificationType,
      }),
    });
    return true;
  } catch (error: unknown) {
    console.warn('[ForegroundNotification] native showNotification failed:', error);
    return false;
  }
};

const openNotificationTarget = (targetPath: string): void => {
  if (navigateHandler) {
    navigateHandler(targetPath);
    return;
  }
  globalThis.location.assign(targetPath);
};

const showInAppNotification = (notification: ForegroundNotification): void => {
  const locale = getDocumentLocale();

  toast(notification.title, {
    ...(notification.body !== '' && { description: notification.body }),
    action: {
      label: openActionLabel[locale],
      onClick: (): void => openNotificationTarget(notification.targetPath),
    },
  });
};

/**
 * Surfaces an incoming message while the native app is open.
 *
 * No-ops when the notification is irrelevant: outside the native app, while the
 * WebView is not visible (the OS handles delivery then), while the user already
 * looks at the target, or when the same message was already surfaced through the
 * other delivery channel.
 */
export const notifyForegroundMessage = (notification: ForegroundNotification): void => {
  if (!isNativeAppWebView()) return;

  // While the WebView is hidden the OS renders the FCM notification itself;
  // notifying here would produce a duplicate.
  if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;

  if (isNotificationTargetVisible(notification.chatId, notification.targetPath)) return;

  const messageId = notification.messageId?.trim() ?? '';
  const deduplicationKey =
    messageId === ''
      ? `path:${notification.targetPath}|${notification.body}`
      : `message:${messageId}`;

  if (!registerNotificationKey(deduplicationKey)) return;

  const resolvedNotification: ForegroundNotification = {
    ...notification,
    title:
      notification.title.trim() === ''
        ? defaultNotificationTitle[getDocumentLocale()]
        : notification.title.trim(),
    body: notification.body.trim(),
  };

  if (requestNativeSystemNotification(resolvedNotification)) return;

  showInAppNotification(resolvedNotification);
};
