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
  swUrl: string = '/api/serwist/sw.js',
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
  // 1. Basic API checks (covers Chrome, Firefox, Desktop Safari)
  if (
    typeof globalThis === 'undefined' ||
    !('serviceWorker' in navigator) ||
    !('PushManager' in globalThis) ||
    !('Notification' in globalThis)
  ) {
    return false;
  }

  // 2. iOS/iPadOS Specific Check
  // On iOS < 16.4, Push is not supported.
  // On iOS 16.4+, Push is supported BUT only in "Standalone" (Home Screen) mode.
  // Many devs miss this: In standard Safari tabs, the API might exist but fail.

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
