import { environmentVariables } from '@/config/environment-variables';
import * as admin from 'firebase-admin';

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
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const serviceAccount = require(keyPath) as admin.ServiceAccount;

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
  payload: { title: string; body: string; data: { url?: string; notificationId?: string } },
): Promise<{ success: boolean; error?: string }> {
  const adminInstance = getFirebaseAdmin();

  if (!adminInstance) {
    console.warn('Firebase Admin not initialized, skipping FCM send');
    return { success: false, error: 'Firebase Admin not configured' };
  }

  try {
    await adminInstance.messaging().send({
      token,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: {
        url: payload.data.url ?? '/app/dashboard',
        notificationId: payload.data.notificationId ?? '',
      },
    });
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to send FCM notification:', error);
    return { success: false, error: errorMessage };
  }
}
