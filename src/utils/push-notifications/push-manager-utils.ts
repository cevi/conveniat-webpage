/**
 * Checks if push notifications are fully supported and available in the current context.
 * Checks for:
 * 1. Browser environment (window/globalThis).
 * 2. Secure Context (HTTPS) - Required for Service Workers.
 * 3. Service Worker, PushManager, and Notification APIs.
 *
 * @returns {boolean} True if push notifications are supported.
 */
export const isPushSupported = (): boolean => {
  // Check if we are in a browser environment (guards against SSR/Node)
  if (typeof globalThis === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }

  // Check for Secure Context (HTTPS)
  if (globalThis.isSecureContext === false) {
    return false;
  }

  // Check for specific APIs
  const hasServiceWorker = 'serviceWorker' in navigator;
  const hasPushManager = 'PushManager' in globalThis;
  const hasNotification = 'Notification' in globalThis;
  return hasServiceWorker && hasPushManager && hasNotification;
};

/**
 * Retrieves the current push subscription from the active service worker registration.
 *
 * @returns The PushSubscription if one exists, or undefined.
 */
export const getPushSubscription = async (): Promise<PushSubscription | undefined> => {
  if (!isPushSupported()) {
    return undefined;
  }

  // Early exit if permissions are already denied
  if (Notification.permission === 'denied') return undefined;

  try {
    // We only care about the *active* registration.
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
