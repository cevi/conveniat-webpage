import { environmentVariables } from '@/config/environment-variables';
import { subscribeUser, unsubscribeUser } from '@/utils/push-notification-api';
import { getPushSubscription } from '@/utils/push-notifications/push-manager-utils';
import { registerServiceWorker } from '@/utils/service-worker-utils';
import { urlBase64ToUint8Array } from '@/utils/url-base64-to-uint8-array';
import type webpush from 'web-push';

const vapidPublicKey: string | undefined = environmentVariables.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

/**
 * Retries a promise-returning function a specified number of times.
 */
const retry = async <T>(
  operation: () => Promise<T>,
  retries: number = 3,
  delayMs: number = 1000,
): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    if (retries <= 0) throw error;

    // Do not retry if permission is denied
    if (error instanceof DOMException && error.name === 'NotAllowedError') {
      throw error;
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return retry(operation, retries - 1, delayMs);
  }
};

export const subscribeToPushNotifications = async (
  locale: 'de' | 'fr' | 'en',
): Promise<PushSubscription> => {
  if (Notification.permission === 'denied') {
    throw new Error('Notifications are blocked. Please enable them in your browser settings.');
  }

  // 1. Register Service Worker
  let registration: ServiceWorkerRegistration | undefined;
  try {
    registration = await registerServiceWorker();
  } catch (error) {
    throw new Error('Failed to register service worker for push.', { cause: error });
  }

  if (!registration) {
    throw new Error('Service Workers are not supported in this browser.');
  }

  // 2. Check VAPID Key
  if (vapidPublicKey === '') {
    throw new Error('VAPID public key is not defined.');
  }

  // 3. Subscribe to Push Manager (with retry)
  let sub: PushSubscription;
  try {
    sub = await retry(
      () =>
        registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        }),
      3,
      500,
    );
  } catch (error) {
    throw new Error('Failed to subscribe to Push Manager.', { cause: error });
  }

  // 4. Send subscription to backend (with retry)
  try {
    await retry(() => subscribeUser(sub.toJSON() as webpush.PushSubscription, locale), 3, 1000);
  } catch (error) {
    // Attempt to unsubscribe from Push Manager to keep state consistent
    try {
      await sub.unsubscribe();
    } catch (cleanupError) {
      console.warn('Failed to cleanup subscription after backend error', cleanupError);
    }
    throw new Error('Failed to send subscription to backend.', { cause: error });
  }

  return sub;
};

export const unsubscribeFromPushNotifications = async (): Promise<void> => {
  const subscription = await getPushSubscription();
  if (!subscription) return;

  try {
    await unsubscribeUser(subscription.toJSON() as webpush.PushSubscription);
  } catch (error) {
    console.error('Backend unsubscribe failed', error);
    // Continue nicely to local unsubscribe
  }

  try {
    await subscription.unsubscribe();
  } catch (error) {
    console.error('PushManager unsubscribe failed', error);
    throw error;
  }
};
