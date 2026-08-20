import 'server-only';

import { environmentVariables } from '@/config/environment-variables';
import type { NotificationType } from '@/lib/notification-type';
import * as admin from 'firebase-admin';
import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs';

/**
 * Android notification channels a push can be addressed to.
 *
 * Both must match a channel the native shell actually creates - today
 * `LocalNotificationsModule.ensureChannels()` in cevi/konekta-app, which registers
 * `konekta-push` (regular chat pushes) and `konekta-emergency` (siren sound plus its
 * own vibration pattern, cevi/konekta-app#47) at `IMPORTANCE_HIGH` on every app start.
 *
 * Naming the channel explicitly is what makes background and killed-state pushes work:
 * Android renders those itself without running any app code, so the channel id on the
 * message is the only thing deciding which sound and importance the notification gets.
 *
 * Keeping these in sync with the shell is not optional, because the shell has drifted
 * out from under them before (#1583): the app really did create `konekta-default`
 * until cevi/konekta-app@29d3af24 renamed it to `konekta-push`, and this file kept
 * naming the old id. A channel id the device does not know is not simply ignored -
 * FCM first falls back to the manifest's `default_notification_channel_id`, and only
 * if that channel is missing too does it auto-create its own at `IMPORTANCE_DEFAULT`,
 * which shows no heads-up banner. Both hops missed here, because until
 * cevi/konekta-app#50 the shell created its channels lazily on the first foreground
 * notification rather than at startup.
 *
 * Ignored by Android below API 26, and irrelevant on iOS, which has no channels.
 */
const ANDROID_NOTIFICATION_CHANNEL_ID = 'konekta-push';
const ANDROID_EMERGENCY_NOTIFICATION_CHANNEL_ID = 'konekta-emergency';

/**
 * Emergency siren shipped with the native app, named per platform because each OS
 * resolves it differently: Android by the bare resource name, without the extension,
 * of the file in `res/raw` (`emergency_siren.mp3`); iOS by the full file name in the
 * app bundle (`KonektaLocalNotifications.emergencySoundName`).
 *
 * Only used for notifications the OS renders on its own; while the app is in the
 * foreground the shell picks the siren itself from `data.notificationType`.
 */
const ANDROID_EMERGENCY_SOUND = 'emergency_siren';
const IOS_EMERGENCY_SOUND = 'emergency_siren.caf';

let firebaseAdminInitialized = false;

export function getFirebaseAdmin(): typeof admin | undefined {
  if (firebaseAdminInitialized) {
    return admin;
  }

  const keyPath = environmentVariables.FIREBASE_SERVICE_ACCOUNT_KEY_PATH;

  if (!keyPath) {
    return undefined;
  }

  try {
    const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8')) as admin.ServiceAccount;

    // Check if there's an already initialized app to prevent multiple initializations in dev
    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    }

    firebaseAdminInitialized = true;
    return admin;
  } catch (error) {
    console.warn('Failed to initialize Firebase Admin SDK:', error);
    return undefined;
  }
}

export async function sendFcmNotification(
  token: string,
  payload: {
    title: string;
    body: string;
    data: {
      url?: string;
      chatId?: string;
      messageId?: string;
      notificationId?: string;
      ignoreIfAppOpen?: string;
      ignoreIfUrlMatches?: string;
      /**
       * Selects the presentation the native shell applies. Defaults to `default`;
       * `emergency` routes the push to the siren channel. See {@link NotificationType}.
       */
      notificationType?: NotificationType;
      [key: string]: string | undefined;
    };
  },
): Promise<{ success: boolean; error?: string; errorCode?: string }> {
  const adminInstance = getFirebaseAdmin();

  if (!adminInstance) {
    console.warn('Firebase Admin not initialized, skipping FCM send');
    return { success: false, error: 'Firebase Admin not configured' };
  }

  try {
    // Note: apns-collapse-id causes iOS to replace any previously displayed
    // notification that carries the same value, rather than appending a new one.
    // Callers must supply a fresh notificationId per distinct notification,
    // or intentionally reuse the same notificationId to collapse duplicates.
    const notificationId =
      payload.data.notificationId !== undefined && payload.data.notificationId !== ''
        ? payload.data.notificationId
        : randomUUID();

    // Three consumers, one decision: the Android channel and the iOS sound below cover
    // the notification the OS renders while the app is backgrounded or killed, and the
    // `notificationType` data field covers the one the shell renders itself while the
    // app is in the foreground. All three have to agree or an emergency alert sirens on
    // some devices and not on others.
    const isEmergency = payload.data.notificationType === 'emergency';
    await adminInstance.messaging().send({
      token,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: {
        title: payload.title,
        body: payload.body,
        url: payload.data.url ?? '/app/dashboard',
        notificationId,
        ...(payload.data.chatId !== undefined && { chatId: payload.data.chatId }),
        ...(payload.data.messageId !== undefined && { messageId: payload.data.messageId }),
        ...(payload.data.ignoreIfAppOpen !== undefined && {
          ignoreIfAppOpen: payload.data.ignoreIfAppOpen,
        }),
        ...(payload.data.ignoreIfUrlMatches !== undefined && {
          ignoreIfUrlMatches: payload.data.ignoreIfUrlMatches,
        }),
        ...(isEmergency && { notificationType: 'emergency' }),
      },
      apns: {
        headers: {
          'apns-collapse-id': notificationId,
          'apns-push-type': 'alert',
          'apns-priority': '10',
        },
        payload: {
          aps: {
            alert: {
              title: payload.title,
              body: payload.body,
            },
            // iOS renders the backgrounded/killed-state notification itself, so the
            // siren has to be named here; the file ships in the app bundle. The
            // time-sensitive interruption level mirrors what the shell sets on the
            // foreground path and lets the alert break through Focus modes.
            sound: isEmergency ? IOS_EMERGENCY_SOUND : 'default',
            ...(isEmergency && { 'interruption-level': 'time-sensitive' }),
          },
          notificationId,
          ...(payload.data.url !== undefined && { url: payload.data.url }),
          ...(payload.data.chatId !== undefined && { chatId: payload.data.chatId }),
          ...(payload.data.messageId !== undefined && { messageId: payload.data.messageId }),
          ...(payload.data.ignoreIfUrlMatches !== undefined && {
            ignoreIfUrlMatches: payload.data.ignoreIfUrlMatches,
          }),
          ...(isEmergency && { notificationType: 'emergency' }),
          data: {
            title: payload.title,
            body: payload.body,
            notificationId,
            ...(payload.data.url !== undefined && { url: payload.data.url }),
            ...(payload.data.chatId !== undefined && { chatId: payload.data.chatId }),
            ...(payload.data.messageId !== undefined && { messageId: payload.data.messageId }),
            ...(payload.data.ignoreIfUrlMatches !== undefined && {
              ignoreIfUrlMatches: payload.data.ignoreIfUrlMatches,
            }),
            ...(isEmergency && { notificationType: 'emergency' }),
          },
        },
      },
      android: {
        priority: 'high',
        notification: {
          title: payload.title,
          body: payload.body,
          // Both of these only matter below API 26, where notification channels do not
          // exist yet: without them `NotificationCompat` defaults to PRIORITY_DEFAULT and
          // shows no heads-up banner. From Android O on the channel owns sound and
          // importance and both fields are ignored. Note this is the *display* priority,
          // unlike `android.priority` above, which controls delivery.
          sound: isEmergency ? ANDROID_EMERGENCY_SOUND : 'default',
          priority: 'high',
          channelId: isEmergency
            ? ANDROID_EMERGENCY_NOTIFICATION_CHANNEL_ID
            : ANDROID_NOTIFICATION_CHANNEL_ID,
        },
        data: {
          title: payload.title,
          body: payload.body,
          notificationId,
          url: payload.data.url ?? '/app/dashboard',
          ...(payload.data.chatId !== undefined && { chatId: payload.data.chatId }),
          ...(payload.data.messageId !== undefined && { messageId: payload.data.messageId }),
          ...(payload.data.ignoreIfAppOpen !== undefined && {
            ignoreIfAppOpen: payload.data.ignoreIfAppOpen,
          }),
          ...(payload.data.ignoreIfUrlMatches !== undefined && {
            ignoreIfUrlMatches: payload.data.ignoreIfUrlMatches,
          }),
          ...(isEmergency && { notificationType: 'emergency' }),
        },
      },
    });
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    // The Admin SDK reports the machine-readable reason on `errorInfo.code`
    // (e.g. `messaging/registration-token-not-registered`). Only the human-readable message used
    // to be returned, which left the caller string-matching on text like `NotRegistered` and
    // unable to tell a permanently dead token from a transient failure.
    const errorCode = (error as { errorInfo?: { code?: unknown } } | undefined)?.errorInfo?.code;
    console.error('Failed to send FCM notification:', error);
    return {
      success: false,
      error: errorMessage,
      ...(typeof errorCode === 'string' && { errorCode }),
    };
  }
}
