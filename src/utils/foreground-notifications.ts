'use client';

import type { NotificationType } from '@/lib/notification-type';
import type { Locale, StaticTranslationString } from '@/types/types';
import { isNativeAppWebView } from '@/utils/standalone-check';
import { stripMarkdownFormatting } from '@/utils/strip-markdown-formatting';

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
 * It hands the notification to the native shell through
 * `AppWebViewNativePush.showNotification(...)`, which renders a real system
 * notification even though the app is in the foreground. Open or closed, the app
 * then notifies the same way, through the user's notification settings and on the
 * emergency channel where the message asks for it. Every app build since October
 * 2026 has the command; on an older build the message only shows in the open app.
 *
 * It is driven by *either* delivery channel — the FCM foreground bridge event or
 * the realtime SSE stream — and de-duplicated by message id, so a message that
 * arrives over both channels is only surfaced once.
 *
 * Browser clients are intentionally excluded: there the service worker
 * (`src/features/service-worker/push-notifications.ts`) already decides whether
 * to display a notification, and notifying here as well would double up.
 */

/** Number of remembered notification keys used to de-duplicate SSE vs. push delivery. */
const DEDUPLICATION_CACHE_SIZE = 200;

const defaultNotificationTitle: StaticTranslationString = {
  de: 'Neue Nachricht',
  en: 'New message',
  fr: 'Nouveau message',
};

/** One message of a chat, as the Android app lists it in the chat's notification. */
export interface ConversationMessage {
  senderName?: string | undefined;
  text: string;
  /** A group chat shows its title and every sender; a direct chat neither. Group if unknown. */
  isGroup?: boolean | undefined;
}

/** What the native shell renders, see `NativePushShowNotificationRequest` in cevi/app-core. */
export interface NativeShowNotificationRequest {
  title: string;
  body: string;
  url: string;
  chatId?: string;
  messageId?: string;
  notificationType?: 'emergency';
  /** Replaces what is shown under the same tag, and is what the page closes it by. */
  tag?: string;
  /**
   * One more message of the conversation under `tag`: iOS groups them, the Android app adds
   * it to the chat's conversation notification.
   */
  stack?: boolean;
  /** The message alone and who wrote it, see {@link ForegroundNotification.conversation}. */
  senderName?: string;
  text?: string;
  isGroup?: boolean;
}

export interface ForegroundNotification {
  /** Chat the notification belongs to, when it is a chat message. */
  chatId?: string | undefined;
  /** Stable message id, used to de-duplicate SSE and push delivery of the same message. */
  messageId?: string | undefined;
  title: string;
  body: string;
  /** In-app path opened when the user interacts with the notification. */
  targetPath: string;
  /**
   * Which channel the native shell should render this on. Defaults to `default`;
   * `emergency` gets the siren and the alarm vibration pattern. See
   * {@link NotificationType}.
   */
  notificationType?: NotificationType | undefined;
  /**
   * The tag the notification is shown under, the same one the server puts on the push, so
   * the native shell replaces and closes it like the one the OS renders in the background.
   * See `notificationGroupingOf`.
   */
  tag?: string | undefined;
  /** One more message of the conversation under {@link tag}. */
  stack?: boolean | undefined;
  /**
   * The message of a chat apart from its sender, for the Android app, which lists a chat's
   * messages under their senders. `body` still has the sender in front, for everyone else.
   */
  conversation?: ConversationMessage | undefined;
}

const notifiedKeys = new Set<string>();
const notifiedKeyOrder: string[] = [];

/** Exposed for tests: clears the de-duplication cache between cases. */
export const resetForegroundNotificationState = (): void => {
  notifiedKeys.clear();
  notifiedKeyOrder.length = 0;
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

/** The message and its sender without the chat's markdown, like the title and body. */
const stripConversationMarkdown = (conversation: ConversationMessage): ConversationMessage => {
  const senderName =
    conversation.senderName === undefined
      ? undefined
      : stripMarkdownFormatting(conversation.senderName).trim();
  return {
    ...conversation,
    text: stripMarkdownFormatting(conversation.text).trim(),
    senderName: senderName === '' ? undefined : senderName,
  };
};

/** Asks the native shell to render a real system notification. */
const requestNativeSystemNotification = (notification: ForegroundNotification): void => {
  const bridge = globalThis.AppWebViewNativePush as Record<string, unknown> | undefined;
  const showNotification = bridge?.['showNotification'];
  if (typeof showNotification !== 'function') return;

  try {
    (showNotification as (request: NativeShowNotificationRequest) => void)({
      title: notification.title,
      body: notification.body,
      url: notification.targetPath,
      ...(notification.chatId !== undefined && { chatId: notification.chatId }),
      ...(notification.messageId !== undefined && { messageId: notification.messageId }),
      // The shell reads this to pick the emergency channel; anything other than
      // `emergency` (including omitting it) means the regular chat channel.
      ...(notification.notificationType === 'emergency' && { notificationType: 'emergency' }),
      ...(notification.tag !== undefined && { tag: notification.tag }),
      ...(notification.tag !== undefined && notification.stack === true && { stack: true }),
      ...(notification.conversation !== undefined && {
        text: notification.conversation.text,
        ...(notification.conversation.senderName !== undefined && {
          senderName: notification.conversation.senderName,
        }),
        ...(notification.conversation.isGroup !== undefined && {
          isGroup: notification.conversation.isGroup,
        }),
      }),
    });
  } catch (error: unknown) {
    console.warn('[ForegroundNotification] native showNotification failed:', error);
  }
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

  // The system notification the shell renders does not understand the chat's
  // markdown dialect, so the markers have to go - the same way the server strips
  // them off the push it sends (see `stripMarkdownFormatting`). Open or closed, the
  // app shows the same message; it must not be wrapped in asterisks only one way.
  const strippedTitle = stripMarkdownFormatting(notification.title).trim();

  const resolvedNotification: ForegroundNotification = {
    ...notification,
    title: strippedTitle === '' ? defaultNotificationTitle[getDocumentLocale()] : strippedTitle,
    body: stripMarkdownFormatting(notification.body).trim(),
    ...(notification.conversation !== undefined && {
      conversation: stripConversationMarkdown(notification.conversation),
    }),
  };

  requestNativeSystemNotification(resolvedNotification);
};
