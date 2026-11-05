import { environmentVariables } from '@/config/environment-variables';
import { subscribeUser, unsubscribeUser } from '@/utils/push-notification-api';
import {
  getPushSubscription,
  isPushSupported,
} from '@/utils/push-notifications/push-manager-utils';
import { PushSubscribeError } from '@/utils/push-notifications/push-subscribe-error';
import { reportRenewedPushSubscription } from '@/utils/push-notifications/report-renewed-push-subscription';
import { registerServiceWorker } from '@/utils/service-worker-utils';
import { urlBase64ToUint8Array } from '@/utils/url-base64-to-uint8-array';
import type webpush from 'web-push';

const vapidPublicKey: string | undefined = environmentVariables.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

const isNotAllowedError = (error: unknown): boolean =>
  error instanceof DOMException && error.name === 'NotAllowedError';

// A function, so the answer to the prompt is read and not the value narrowed before it.
const currentPermission = (): NotificationPermission => Notification.permission;

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
    if (isNotAllowedError(error)) {
      throw error;
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return retry(operation, retries - 1, delayMs);
  }
};

export const subscribeToPushNotifications = async (
  locale: 'de' | 'fr' | 'en',
  registrationSource?: '/entrypoint' | '/app/settings' | 'restored',
): Promise<PushSubscription> => {
  if (Notification.permission === 'denied') {
    throw new PushSubscribeError('blocked', 'Notifications are blocked in this browser.');
  }

  // 1. Register Service Worker
  let registration: ServiceWorkerRegistration | undefined;
  try {
    registration = await registerServiceWorker();
  } catch (error) {
    throw new PushSubscribeError('not-ready', 'Failed to register service worker for push.', {
      cause: error,
    });
  }

  if (!registration) {
    throw new PushSubscribeError('not-ready', 'No service worker to subscribe with.');
  }

  // 2. Check VAPID Key
  if (vapidPublicKey === '') {
    throw new PushSubscribeError('not-ready', 'VAPID public key is not defined.');
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
    // The prompt was refused or closed. Whether it can be asked again is the permission's call.
    if (isNotAllowedError(error)) {
      const reason = currentPermission() === 'denied' ? 'blocked' : 'dismissed';
      throw new PushSubscribeError(reason, 'Notifications were not allowed.', { cause: error });
    }
    throw new PushSubscribeError('push-service', 'Failed to subscribe to Push Manager.', {
      cause: error,
    });
  }

  // 4. Send subscription to backend (with retry)
  try {
    const userAgent = typeof navigator === 'undefined' ? undefined : navigator.userAgent;
    const { getOrCreateDeviceId } = await import('@/utils/device-id');
    const deviceId = getOrCreateDeviceId();
    const stored = await retry(
      () =>
        subscribeUser(
          sub.toJSON() as webpush.PushSubscription,
          locale,
          userAgent,
          registrationSource,
          deviceId,
        ),
      3,
      1000,
    );
    // Without a session, or with an endpoint that belongs to no known push service, the
    // server stores nothing, and a retry changes neither.
    if (!stored.success) throw new Error('The server refused the push subscription.');
  } catch (error) {
    // Attempt to unsubscribe from Push Manager to keep state consistent
    try {
      await sub.unsubscribe();
    } catch (cleanupError) {
      console.warn('Failed to cleanup subscription after backend error', cleanupError);
    }
    throw new PushSubscribeError('server', 'Failed to send subscription to backend.', {
      cause: error,
    });
  }

  return sub;
};

const isSameKey = (left: Uint8Array, right: Uint8Array): boolean =>
  left.length === right.length && left.every((byte, index) => byte === right[index]);

/**
 * Moves this browser's subscription onto the current VAPID key. A subscription stays bound to
 * the key it was created with, so after a key change the push service rejects every send to
 * it, and no browser fires `pushsubscriptionchange` for that. Only the page can notice.
 */
export const renewPushSubscriptionOnStaleKey = async (): Promise<void> => {
  if (vapidPublicKey === '') return;
  // Unsubscribing needs the push service, so offline this would drop the subscription it fixes.
  if (!navigator.onLine || Notification.permission !== 'granted') return;

  const subscription = await getPushSubscription();
  const subscribedKey = subscription?.options.applicationServerKey;
  if (!subscription || !subscribedKey) return;

  const currentKey = urlBase64ToUint8Array(vapidPublicKey);
  if (isSameKey(new Uint8Array(subscribedKey), currentKey)) return;

  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return;

  const staleSubscription = subscription.toJSON();
  // A registration holds one subscription, so the stale one has to go first.
  await subscription.unsubscribe();
  const renewedSubscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: currentKey,
  });
  await retry(
    () => reportRenewedPushSubscription(staleSubscription, renewedSubscription.toJSON()),
    3,
    1000,
  );
};

/**
 * Subscribes this browser again when it has the permission but no subscription. The browser
 * drops a subscription on its own when its push service expires it, without firing
 * `pushsubscriptionchange`, and an unregistered service worker takes its subscription along;
 * until something subscribes again, the phone stays silent. The caller decides that the user
 * did not turn push off, see the `web-push-opted-out` preference.
 *
 * @returns whether it subscribed.
 */
export const restoreLostPushSubscription = async (locale: 'de' | 'fr' | 'en'): Promise<boolean> => {
  if (vapidPublicKey === '' || !isPushSupported()) return false;
  if (!navigator.onLine || Notification.permission !== 'granted') return false;

  // Registering the worker is the service worker manager's job. With Serwist disabled,
  // `registerServiceWorker` would unregister every worker and reload the page instead.
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return false;
  if ((await registration.pushManager.getSubscription()) !== null) return false;

  await subscribeToPushNotifications(locale, 'restored');
  return true;
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
