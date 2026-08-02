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

    // Request current status from the bridge on mount
    globalThis.AppWebViewNativePush?.getStatus();

    const handleEvent = (event: Event): void => {
      const customEvent = event as CustomEvent<NativePushEventDetail | null | undefined>;
      const detail = customEvent.detail ?? {};
      const type = detail.type;
      const payload = detail.payload ?? {};

      if (type === 'native-push-status') {
        const label = payload['authorizationLabel'];
        const hasToken =
          payload['hasToken'] === true ||
          payload['hasToken'] === 'true' ||
          (typeof payload['token'] === 'string' && payload['token'] !== '');

        const isGranted = label === 'authorized' || label === 'provisional';
        setHasSubscription(isGranted && hasToken);
      } else if (type === 'native-push-token' && typeof payload['token'] === 'string') {
        // Token received means push is fully active
        setHasSubscription(true);
      }
    };

    globalThis.addEventListener('app-webview-native-push-event', handleEvent);
    return (): void => {
      globalThis.removeEventListener('app-webview-native-push-event', handleEvent);
    };
  }, [isNative]);

  return hasSubscription;
}
