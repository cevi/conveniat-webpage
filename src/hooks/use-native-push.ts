'use client';

import { trpc } from '@/trpc/client';
import { isNativeAppWebView } from '@/utils/standalone-check';
import { useRouter } from 'next/navigation';
import posthog from 'posthog-js';
import { useEffect, useState } from 'react';

export type NativePushStatus = 'granted' | 'denied' | 'prompt' | 'unknown';

declare global {
  // eslint-disable-next-line no-var
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
    const timeoutId = setTimeout(() => {
      setIsNativeApp(isNative);
    }, 0);

    if (!isNative) return;

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
          globalThis.AppWebViewNativePush?.getStatus();
          break;
        }
        case 'native-push-status': {
          if (typeof payload['status'] === 'string') {
            setStatus(payload['status'] as NativePushStatus);
            setHasToken(!!payload['hasToken']);
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
                posthog.capture('native_push_register_error', { error: error.message });
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
            router.push(payload['url']);
          } else {
            router.push('/app/dashboard');
          }
          break;
        }
        case 'native-push-error': {
          console.error('Native push error:', payload['error']);
          posthog.capture('native_push_error', { error: payload['error'] });
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
