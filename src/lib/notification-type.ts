/**
 * How urgently a push notification should be presented.
 *
 * The native shell (cevi/konekta-app) creates two Android notification channels on
 * every app start and picks between them per notification:
 *
 * - `default` -> `konekta-push`, the regular chat channel.
 * - `emergency` -> `konekta-emergency`, which carries a siren sound and its own
 *   vibration pattern so an emergency alert stands out from a chat message.
 *
 * The value travels in the FCM `data` payload under `notificationType`. That is what
 * the shell reads for the notifications it renders itself while the app is in the
 * foreground (`LocalNotificationsModule.displayNotification` on Android,
 * `LocalNotifications.swift` on iOS). Background notifications never run app code -
 * the OS renders them straight from the message - so the server additionally has to
 * name the Android channel and the iOS sound; see `@/lib/firebase-admin`.
 *
 * Kept out of `firebase-admin.ts` because that module is `server-only` while the
 * foreground path needs the same vocabulary in the browser bundle.
 */
export type NotificationType = 'default' | 'emergency';
