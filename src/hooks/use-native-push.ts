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

    console.log(
      '[NativePush:PWA] hook mounted: isNative =',
      isNative,
      '| bridgeReady =',
      isBridgeReady,
    );

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

      console.log('[NativePush:PWA] event received:', type);

      switch (type) {
        case 'native-push-ready': {
          console.log('[NativePush:PWA] bridge ready, requesting status');
          setIsNativeApp(true);
          globalThis.AppWebViewNativePush?.getStatus();
          break;
        }
        case 'native-push-status': {
          const statusValue = payload['authorizationLabel'] ?? payload['status'];
          if (typeof statusValue === 'string') {
            const tokenValue = payload['token'];
            const hasTokenValue =
              payload['hasToken'] === undefined
                ? typeof tokenValue === 'string' && tokenValue !== ''
                : payload['hasToken'] === true || payload['hasToken'] === 'true';
            console.log(
              '[NativePush:PWA] status update: authLabel =',
              statusValue,
              '| hasToken =',
              hasTokenValue,
            );
            setStatus(statusValue as NativePushStatus);
            setHasToken(hasTokenValue);
          }
          break;
        }
        case 'native-push-token': {
          const token = payload['token'];
          const platform = payload['platform'];
          console.log('[NativePush:PWA] token received: platform =', platform);
          if (typeof token === 'string' && typeof platform === 'string') {
            console.log('[NativePush:PWA] calling registerDevice: platform =', platform);
            registerDevice({
              token,
              platform: platform as 'ios' | 'android',
            })
              .then(() => {
                console.log('[NativePush:PWA] registerDevice: success');
              })
              .catch((error: unknown) => {
                console.error('[NativePush:PWA] registerDevice: failed', error);
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
          const token = payload['token'];
          const platform = payload['platform'];
          console.log('[NativePush:PWA] token deleted: platform =', platform);
          if (typeof token === 'string' && typeof platform === 'string') {
            console.log('[NativePush:PWA] calling unregisterDevice: platform =', platform);
            unregisterDevice({
              token,
              platform: platform as 'ios' | 'android',
            })
              .then(() => {
                console.log('[NativePush:PWA] unregisterDevice: success');
              })
              .catch((error: unknown) => {
                console.error('[NativePush:PWA] unregisterDevice: failed', error);
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
            console.log(
              '[NativePush:PWA] notification opened, navigating to:',
              isRelative ? url : '/app/dashboard',
            );
            router.push(isRelative ? url : '/app/dashboard');
          } else {
            console.log(
              '[NativePush:PWA] notification opened (no url), navigating to /app/dashboard',
            );
            router.push('/app/dashboard');
          }
          break;
        }
        case 'native-push-error': {
          console.error('[NativePush:PWA] bridge error:', payload['error']);
          void import('posthog-js').then(({ default: ph }) => {
            ph.capture('native_push_error', { error: payload['error'] });
          });
          break;
        }
      }
    };

    globalThis.addEventListener('app-webview-native-push-event', handleNativeEvent);

    // Initial status check
    console.log('[NativePush:PWA] requesting initial status');
    globalThis.AppWebViewNativePush?.getStatus();

    return (): void => {
      clearTimeout(timeoutId);
      globalThis.removeEventListener('app-webview-native-push-event', handleNativeEvent);
    };
  }, [router, registerDevice, unregisterDevice]);

  const requestPermission = (): void => {
    if (isNativeApp) {
      console.log('[NativePush:PWA] requestPermission called');
      globalThis.AppWebViewNativePush?.requestPermission();
    }
  };

  const deleteToken = (): void => {
    if (isNativeApp) {
      console.log('[NativePush:PWA] deleteToken called');
      globalThis.AppWebViewNativePush?.deleteToken();
    }
  };

  const openSettings = (): void => {
    if (isNativeApp) {
      console.log('[NativePush:PWA] openSettings called');
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
