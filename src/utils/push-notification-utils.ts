import { environmentVariables } from '@/config/environment-variables';
import { subscribeUser } from '@/utils/push-notification-api';
import { urlBase64ToUint8Array } from '@/utils/url-base64-to-uint8-array';
import type webpush from 'web-push';

const vapidPublicKey: string | undefined = environmentVariables.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

export const getPushSubscription = async (): Promise<PushSubscription | undefined> => {
  if (
    typeof navigator === 'undefined' ||
    !('serviceWorker' in navigator) ||
    typeof globalThis === 'undefined' ||
    !('PushManager' in globalThis)
  ) {
    return undefined;
  }

  // Early exit if permissions are already denied
  if (Notification.permission === 'denied') return undefined;

  try {
    // We only care about the *active* registration.
    // If there is no SW, we shouldn't be asking for a subscription yet.
    const registration = await navigator.serviceWorker.getRegistration();

    if (!registration) {
      return undefined;
    }

    const subscription = await registration.pushManager.getSubscription();
    return subscription ?? undefined;
  } catch (error) {
    console.error('Error retrieving push subscription:', error);
    return undefined;
  }
};

export const registerServiceWorker = async (
  swUrl: string = '/sw.js',
): Promise<ServiceWorkerRegistration | undefined> => {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return undefined;
  }

  try {
    const registration = await navigator.serviceWorker.register(swUrl, {
      scope: '/',
      updateViaCache: 'none',
    });

    // Wait for the service worker to be ready before resolving
    await navigator.serviceWorker.ready;

    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return undefined;
  }
};

export const isPushSupported = (): boolean => {
  // Basic API checks (covers Chrome, Firefox, Desktop Safari)
  if (
    typeof globalThis === 'undefined' ||
    !('serviceWorker' in navigator) ||
    !('PushManager' in globalThis) ||
    !('Notification' in globalThis)
  ) {
    return false;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(globalThis as any).MSStream;

  if (isIOS) {
    // Check if the app is running in standalone mode (added to home screen)
    const isStandalone = globalThis.matchMedia('(display-mode: standalone)').matches;
    return isStandalone;
  }

  // For Android/Desktop, we assume support if APIs exist.
  return true;
};

export const subscribeToPushNotifications = async (
  swUrl: string,
  locale: 'de' | 'fr' | 'en',
): Promise<PushSubscription> => {
  const registration = await registerServiceWorker(swUrl);
  if (!registration) {
    throw new Error('Failed to register service worker for push.');
  }

  if (!vapidPublicKey) {
    throw new Error('VAPID public key is not defined.');
  }

  const sub = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
  });

  await subscribeUser(sub.toJSON() as webpush.PushSubscription, locale);

  return sub;
};
