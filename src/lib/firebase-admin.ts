import 'server-only';

import { environmentVariables } from '@/config/environment-variables';
import * as admin from 'firebase-admin';
import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs';

/**
 * Android notification channel every non-emergency push is addressed to.
 *
 * It must match the channel the native shell actually creates - today
 * `MainApplication.ensureChannels()` / `LocalNotificationsModule.ensureChannel()` in
 * cevi/konekta-app, which registers `konekta-push` at `IMPORTANCE_HIGH` on every app
 * start (its `AndroidManifest.xml` also points
 * `com.google.firebase.messaging.default_notification_channel_id` at the same channel).
 *
 * Addressing it explicitly matters because a channel id the app never created makes
 * FCM post to its own auto-created fallback channel at default importance instead -
 * which shows no heads-up banner. This constant previously named `konekta-default`, a
 * channel the app has never created; see cevi/conveniat-webpage#1583.
 *
 * Ignored by Android below API 26, and irrelevant on iOS, which has no channels.
 */
const ANDROID_NOTIFICATION_CHANNEL_ID = 'konekta-push';

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
            sound: 'default',
          },
          notificationId,
          ...(payload.data.url !== undefined && { url: payload.data.url }),
          ...(payload.data.chatId !== undefined && { chatId: payload.data.chatId }),
          ...(payload.data.messageId !== undefined && { messageId: payload.data.messageId }),
          ...(payload.data.ignoreIfUrlMatches !== undefined && {
            ignoreIfUrlMatches: payload.data.ignoreIfUrlMatches,
          }),
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
          sound: 'default',
          priority: 'high',
          channelId: ANDROID_NOTIFICATION_CHANNEL_ID,
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
