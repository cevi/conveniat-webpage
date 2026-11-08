import 'server-only';

import { environmentVariables } from '@/config/environment-variables';
import type { NotificationType } from '@/lib/notification-type';
import { createLogger } from '@/utils/server-logger';
import * as admin from 'firebase-admin';
import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs';

const logger = createLogger('firebase-admin');

/**
 * Android notification channels a push can be addressed to.
 *
 * Both must match a channel the native shell actually creates - today
 * `LocalNotificationsModule.ensureChannels()` in cevi/conveniat27-app, which registers
 * `conveniat27-push` (regular chat pushes) and `conveniat27-emergency` (siren sound
 * plus its own vibration pattern) at `IMPORTANCE_HIGH` on every app start; the ids
 * themselves live in that repo's `strings.xml`.
 *
 * Naming the channel explicitly is what makes background and killed-state pushes work:
 * Android renders those itself without running any app code, so the channel id on the
 * message is the only thing deciding which sound and importance the notification gets.
 *
 * Keeping these in sync with the shell is not optional, because this constant has
 * drifted out from under the shell before (#1583): it named `konekta-push`, copied
 * from cevi/konekta-app, while the shell only ever created `conveniat27-push`.
 *
 * What happens to a channel id the device does not know is the documented FCM chain,
 * and it is also why no version check guards `conveniat27-emergency` here. FCM tries,
 * in order: the id on the message, then the manifest's `default_notification_channel_id`,
 * then a channel it auto-creates itself at `IMPORTANCE_DEFAULT` (no heads-up banner).
 * The manifest points at `conveniat27-push`, which `LocalNotificationsModule` creates
 * at `IMPORTANCE_HIGH` on every app start - so a build predating the emergency channel
 * lands on the regular channel by itself: no siren, but a heads-up banner, which is
 * exactly what an old build should get. Only the second hop failing drops a
 * notification to default importance, and that needs an app so old it creates no
 * channel at all.
 *
 * The alternative - having the server decide from a reported app version - was tried
 * (on konekta-app) and removed: the shell's version info is captured at bundle time
 * and release builds ship stale values, so it would have silently downgraded
 * up-to-date devices. There is nothing on the bridge to feature-detect the channel
 * with either.
 *
 * Ignored by Android below API 26, and irrelevant on iOS, which has no channels.
 */
const ANDROID_NOTIFICATION_CHANNEL_ID = 'conveniat27-push';
const ANDROID_EMERGENCY_NOTIFICATION_CHANNEL_ID = 'conveniat27-emergency';

/**
 * Emergency siren shipped with the native app, named per platform because each OS
 * resolves it differently: Android by the bare resource name, without the extension,
 * of the file in `res/raw` (`emergency_siren.mp3`); iOS by the full file name in the
 * app bundle (`emergency_siren.caf`).
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
    logger.warn('Failed to initialize the Firebase Admin SDK', { error });
    return undefined;
  }
}

export async function sendFcmNotification(
  token: string,
  payload: {
    title: string;
    body: string;
    /**
     * How long FCM and APNs keep the push for a device that is offline. Without it FCM keeps
     * a push for four weeks.
     */
    timeToLiveSeconds?: number;
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
      /**
       * The notification's tag, as on the web: on Android a push under a tag replaces the
       * notification already shown under it, and the shell closes notifications by tag.
       */
      tag?: string;
      /**
       * `'true'` when the push is one more message of the conversation under `tag`. iOS shows
       * one per message and groups them by the tag; an Android build that does not draw chat
       * notifications itself replaces the conversation's one, see `conversation`.
       */
      stack?: 'true';
      [key: string]: string | undefined;
    };
    /**
     * Set when the device is the Android app that draws a chat's notification itself, as one
     * conversation listing its messages. The push then goes as data only, so Android draws
     * nothing of its own, and carries the message apart from its sender.
     */
    conversation?: {
      senderName?: string;
      /** The message alone; `body` has the sender in front. */
      text: string;
      /** A group chat shows its title and the sender of every message; a direct chat neither. */
      isGroup: boolean;
    };
  },
): Promise<{ success: boolean; error?: string; errorCode?: string }> {
  const adminInstance = getFirebaseAdmin();

  if (!adminInstance) {
    logger.debug('Firebase Admin is not initialized, skipping the FCM send');
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
    const timeToLiveSeconds = payload.timeToLiveSeconds;
    // The shell reads the tag from `android.data` and from the root of the APNs payload, the
    // `userInfo` of what iOS rendered, to find and close it later. `apns-collapse-id` stays the push log id: it may be 64 bytes at most, which an
    // emergency tag with its two ids exceeds, and a stacked chat must not collapse anyway.
    const tag = payload.data.tag === '' ? undefined : payload.data.tag;
    const grouping = {
      ...(tag !== undefined && { tag }),
      ...(tag !== undefined && payload.data.stack === 'true' && { stack: 'true' }),
    };
    const data = {
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
      ...grouping,
    };

    if (payload.conversation !== undefined) {
      // High priority, as for every chat message: FCM keeps it only for data that ends in a
      // notification the person sees, and the app draws one for every message.
      await adminInstance.messaging().send({
        token,
        android: {
          priority: 'high',
          ...(timeToLiveSeconds !== undefined && { ttl: timeToLiveSeconds * 1000 }),
          data: {
            ...data,
            text: payload.conversation.text,
            isGroup: payload.conversation.isGroup ? 'true' : 'false',
            ...(payload.conversation.senderName !== undefined && {
              senderName: payload.conversation.senderName,
            }),
          },
        },
      });
      return { success: true };
    }

    await adminInstance.messaging().send({
      token,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data,
      apns: {
        headers: {
          'apns-collapse-id': notificationId,
          'apns-push-type': 'alert',
          'apns-priority': '10',
          ...(timeToLiveSeconds !== undefined && {
            'apns-expiration': String(Math.floor(Date.now() / 1000 + timeToLiveSeconds)),
          }),
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
            // Groups the notifications of one tag, the messages of a chat, into one stack.
            ...(tag !== undefined && { 'thread-id': tag }),
          },
          notificationId,
          ...(payload.data.url !== undefined && { url: payload.data.url }),
          ...(payload.data.chatId !== undefined && { chatId: payload.data.chatId }),
          ...(payload.data.messageId !== undefined && { messageId: payload.data.messageId }),
          ...(payload.data.ignoreIfUrlMatches !== undefined && {
            ignoreIfUrlMatches: payload.data.ignoreIfUrlMatches,
          }),
          ...(isEmergency && { notificationType: 'emergency' }),
          ...(tag !== undefined && { tag }),
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
        ...(timeToLiveSeconds !== undefined && { ttl: timeToLiveSeconds * 1000 }),
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
          // Firebase posts the notification under this tag, so the next push of the same chat
          // replaces it and the shell can close it once the chat is read.
          ...(tag !== undefined && { tag }),
        },
        // `android.data` replaces the message's `data` on Android, so it is the same.
        data,
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
    // Not an error line: the caller decides whether this is a dead token, a retry or a fault,
    // and logs it at that level. Logging every dead token as an error here drowned the real ones.
    logger.debug('The FCM send was rejected', { error, 'error.code': errorCode });
    return {
      success: false,
      error: errorMessage,
      ...(typeof errorCode === 'string' && { errorCode }),
    };
  }
}
