'use client';

import { trpc } from '@/trpc/client';
import { isNativeAppWebView } from '@/utils/standalone-check';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export type NativePushStatus = 'granted' | 'denied' | 'prompt' | 'unknown';

declare global {
  var AppWebViewNativePush:
    | {
        getStatus: () => void;
        requestPermission: () => void;
        deleteToken: () => void;
        openSettings: () => void;
      }
    | undefined;
}

export function useNativePush(): {
  isNativeApp: boolean;
  status: NativePushStatus;
  hasToken: boolean;
  requestPermission: () => void;
  deleteToken: () => void;
  openSettings: () => void;
} {
  const router = useRouter();
  const [isNativeApp, setIsNativeApp] = useState(false);
  const [status, setStatus] = useState<NativePushStatus>('unknown');
  const [hasToken, setHasToken] = useState(false);

  const { mutateAsync: registerDevice } = trpc.nativePush.registerDevice.useMutation();
  const { mutateAsync: unregisterDevice } = trpc.nativePush.unregisterDevice.useMutation();

  useEffect(() => {
    const isNative = isNativeAppWebView();
    // Maintain backward compatibility for older app versions that don't inject the bridge
    const isBridgeReady = globalThis.AppWebViewNativePush !== undefined;

    const timeoutId = setTimeout(() => {
      setIsNativeApp(isNative && isBridgeReady);
    }, 0);

    if (!isNative) return (): void => clearTimeout(timeoutId);

    const handleNativeEvent = (event: Event): void => {
      const customEvent = event as CustomEvent<
        | {
            type?: string;
            payload?: Record<string, unknown>;
          }
        | null
        | undefined
      >;
      const detail = customEvent.detail ?? {};
      const type = detail.type;
      const payload = detail.payload ?? {};

      switch (type) {
        case 'native-push-ready': {
          setIsNativeApp(true);
          globalThis.AppWebViewNativePush?.getStatus();
          break;
        }
        case 'native-push-status': {
          const statusValue = payload['authorizationLabel'] ?? payload['status'];
          if (typeof statusValue === 'string') {
            setStatus(statusValue as NativePushStatus);
            const tokenValue = payload['token'];
            const hasTokenValue =
              payload['hasToken'] === undefined
                ? typeof tokenValue === 'string' && tokenValue !== ''
                : payload['hasToken'] === true || payload['hasToken'] === 'true';
            setHasToken(hasTokenValue);
          }
          break;
        }
        case 'native-push-token': {
          if (typeof payload['token'] === 'string' && typeof payload['platform'] === 'string') {
            registerDevice({
              token: payload['token'],
              platform: payload['platform'] as 'ios' | 'android',
            }).catch((error: unknown) => {
              console.error('Failed to register native device token', error);
              if (error instanceof Error) {
                void import('posthog-js').then(({ default: ph }) => {
                  ph.capture('native_push_register_error', { error: error.message });
                });
              }
            });
            setStatus('granted');
            setHasToken(true);
          }
          break;
        }
        case 'native-push-token-deleted': {
          if (typeof payload['token'] === 'string' && typeof payload['platform'] === 'string') {
            unregisterDevice({
              token: payload['token'],
              platform: payload['platform'] as 'ios' | 'android',
            }).catch((error: unknown) => {
              console.error('Failed to unregister native device token', error);
            });
          }
          setHasToken(false);
          setStatus('prompt');
          break;
        }
        case 'native-push-open': {
          if (typeof payload['url'] === 'string') {
            // Only allow relative (same-origin) paths to prevent open redirects
            const url = payload['url'];
            const isRelative = url.startsWith('/') && !url.startsWith('//');
            router.push(isRelative ? url : '/app/dashboard');
          } else {
            router.push('/app/dashboard');
          }
          break;
        }
        case 'native-push-error': {
          console.error('Native push error:', payload['error']);
          void import('posthog-js').then(({ default: ph }) => {
            ph.capture('native_push_error', { error: payload['error'] });
          });
          break;
        }
      }
    };

    globalThis.addEventListener('app-webview-native-push-event', handleNativeEvent);

    // Initial status check
    globalThis.AppWebViewNativePush?.getStatus();

    return (): void => {
      clearTimeout(timeoutId);
      globalThis.removeEventListener('app-webview-native-push-event', handleNativeEvent);
    };
  }, [router, registerDevice, unregisterDevice]);

  const requestPermission = (): void => {
    if (isNativeApp) {
      globalThis.AppWebViewNativePush?.requestPermission();
    }
  };

  const deleteToken = (): void => {
    if (isNativeApp) {
      globalThis.AppWebViewNativePush?.deleteToken();
    }
  };

  const openSettings = (): void => {
    if (isNativeApp) {
      globalThis.AppWebViewNativePush?.openSettings();
    }
  };

  return {
    isNativeApp,
    status,
    hasToken,
    requestPermission,
    deleteToken,
    openSettings,
  };
}
