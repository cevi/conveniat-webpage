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

/**
 * First native build that creates the `konekta-emergency` channel.
 *
 * The channel and the startup `ensureChannels()` call that registers it both landed in
 * cevi/konekta-app#50, released as build 13 (`versionCode 13` on Android,
 * `CURRENT_PROJECT_VERSION = 13` on iOS - the two platforms share one build counter,
 * which is what the app's `<marketing>.<build>` release tags are numbered from).
 *
 * Below this, naming `konekta-emergency` is worse than not asking for it: Android
 * cannot find the channel, falls through to the manifest default and then to its own
 * auto-created channel at `IMPORTANCE_DEFAULT`, and the alert ends up *quieter* than an
 * ordinary chat message, which lands on `konekta-push` at `IMPORTANCE_HIGH`. Those
 * devices get the regular channel instead - no siren, but a heads-up banner.
 */
const MIN_EMERGENCY_CHANNEL_BUILD_NUMBER = 13;

/**
 * Whether a device's app build knows the emergency channel.
 *
 * `appBuildNumber` is what the shell reports as `AppWebViewNativeApp.buildNumber` and
 * the device recorded at its last `registerDevice` call. Unknown means "assume not":
 * subscriptions registered before the server started recording it have no value, and
 * every one of them re-registers on the next app launch, so guessing optimistically
 * would buy nothing and mis-route real alerts in the meantime.
 */
export const supportsEmergencyChannel = (appBuildNumber: string | null | undefined): boolean => {
  if (appBuildNumber === null || appBuildNumber === undefined) return false;

  const parsed = Number.parseInt(appBuildNumber.trim(), 10);
  if (Number.isNaN(parsed)) return false;

  return parsed >= MIN_EMERGENCY_CHANNEL_BUILD_NUMBER;
};
