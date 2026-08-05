'use client';

import { isNativeAppWebView } from '@/utils/standalone-check';
import { useEffect, useState, useSyncExternalStore } from 'react';

interface NativePushEventDetail {
  type?: string;
  payload?: Record<string, unknown>;
}

const noopUnsubscribe = (): undefined => undefined;
const subscribeToNothing = (): (() => void) => noopUnsubscribe;
const getServerIsNative = (): boolean => false;

/**
 * Lightweight hook that tracks whether the native push subscription is active.
 *
 * Unlike `useNativePush`, this hook has NO tRPC/mutation dependencies and is
 * safe to use inside the onboarding layout (which does not wrap the app in a
 * `TRPCProvider`).  It only listens for `app-webview-native-push-event`
 * custom events dispatched by the native bridge and derives a boolean
 * `hasNativePushSubscription`.
 *
 * Returns `false` when the app is NOT running inside a native WebView.
 */
export function useNativePushSubscriptionStatus(): boolean {
  const isNative = useSyncExternalStore(subscribeToNothing, isNativeAppWebView, getServerIsNative);
  const [hasSubscription, setHasSubscription] = useState(false);

  useEffect(() => {
    if (!isNative) return;

    let isInitialMount = true;
    let isFocusCheck = false;

    const handleEvent = (event: Event): void => {
      const customEvent = event as CustomEvent<NativePushEventDetail | null | undefined>;
      const detail = customEvent.detail ?? {};
      const type = detail.type;
      const payload = detail.payload ?? {};

      if (type === 'native-push-ready') {
        globalThis.AppWebViewNativePush?.getStatus();
      } else if (type === 'native-push-status') {
        const label = payload['authorizationLabel'] ?? payload['status'];
        const hasToken =
          payload['hasToken'] === true ||
          payload['hasToken'] === 'true' ||
          (typeof payload['token'] === 'string' && payload['token'] !== '');

        const isGranted = label === 'authorized' || label === 'granted' || label === 'provisional';

        if (!isGranted) {
          // Permission denied or revoked — always set to false
          setHasSubscription(false);
        } else if (isInitialMount && !isFocusCheck) {
          // Permission granted — only auto-enable on initial mount (if authorized before entering onboarding).
          // Ignore focus-triggered status checks (returning from system settings) so onboarding doesn't auto-skip.
          setHasSubscription(hasToken);
        }
        isInitialMount = false;
        isFocusCheck = false;
      } else if (type === 'native-push-token' && typeof payload['token'] === 'string') {
        // Token received on initial mount or explicit user request
        if (!isFocusCheck) {
          setHasSubscription(true);
        }
        isInitialMount = false;
        isFocusCheck = false;
      }
    };

    globalThis.addEventListener('app-webview-native-push-event', handleEvent);
    if (typeof document !== 'undefined') {
      document.addEventListener('app-webview-native-push-event', handleEvent);
    }

    const handleFocus = (): void => {
      isFocusCheck = true;
      globalThis.AppWebViewNativePush?.getStatus();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    // Request current status from the bridge on mount after listener is attached
    globalThis.AppWebViewNativePush?.getStatus();

    return (): void => {
      globalThis.removeEventListener('app-webview-native-push-event', handleEvent);
      if (typeof document !== 'undefined') {
        document.removeEventListener('app-webview-native-push-event', handleEvent);
      }
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [isNative]);

  return hasSubscription;
}
