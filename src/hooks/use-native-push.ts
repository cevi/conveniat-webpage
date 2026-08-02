'use client';

import { trpc } from '@/trpc/client';
import { isNativeAppWebView } from '@/utils/standalone-check';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

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

/**
 * Interface wrapper for AppWebViewNativePush global object to encapsulate bridge calls.
 */
const nativePushBridge = {
  isSupported: (): boolean =>
    typeof globalThis !== 'undefined' && globalThis.AppWebViewNativePush !== undefined,
  getStatus: (): void => globalThis.AppWebViewNativePush?.getStatus(),
  requestPermission: (): void => globalThis.AppWebViewNativePush?.requestPermission(),
  deleteToken: (): void => globalThis.AppWebViewNativePush?.deleteToken(),
  openSettings: (): void => globalThis.AppWebViewNativePush?.openSettings(),
};

interface NativePushEventDetail {
  type?: string;
  payload?: Record<string, unknown>;
}

export interface NativePushLogEntry {
  id: string;
  timestamp: string;
  message: string;
  data?: unknown;
}

export function useNativePush(): {
  isNativeApp: boolean;
  status: NativePushStatus;
  hasToken: boolean;
  isRegisteredOnBackend: boolean;
  isUnauthenticated: boolean;
  requestPermission: () => void;
  deleteToken: () => void;
  openSettings: () => void;
  logs: NativePushLogEntry[];
  lastError: string | undefined;
} {
  const router = useRouter();
  const [isNativeApp, setIsNativeApp] = useState(false);
  const [status, setStatus] = useState<NativePushStatus>('unknown');
  const [hasToken, setHasToken] = useState(false);
  const [isRegisteredOnBackend, setIsRegisteredOnBackend] = useState(false);
  const [isUnauthenticated, setIsUnauthenticated] = useState(false);
  const [logs, setLogs] = useState<NativePushLogEntry[]>([]);
  const [lastError, setLastError] = useState<string | undefined>();
  const rollbackTimeoutReference = useRef<NodeJS.Timeout | undefined>(undefined);

  const addLog = (message: string, data?: unknown): void => {
    const time = new Date().toLocaleTimeString('en-GB', { hour12: false });
    const entry: NativePushLogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: time,
      message,
      data,
    };
    setLogs((previous) => [...previous.slice(-49), entry]);
  };

  const { mutateAsync: registerDevice } = trpc.nativePush.registerDevice.useMutation();
  const { mutateAsync: unregisterDevice } = trpc.nativePush.unregisterDevice.useMutation();

  useEffect(() => {
    const isNative = isNativeAppWebView();
    const isBridgeReady = nativePushBridge.isSupported();

    console.log(
      '[NativePush:PWA] hook mounted: isNative =',
      isNative,
      '| bridgeReady =',
      isBridgeReady,
    );

    const timeoutId = setTimeout(() => {
      setIsNativeApp(isNative && isBridgeReady);
      addLog(`Hook mounted: isNative=${String(isNative)}, bridgeReady=${String(isBridgeReady)}`);
      addLog('Requesting initial status via getStatus()');
    }, 0);

    if (!isNative) return (): void => clearTimeout(timeoutId);

    const handleRegisterDevice = async (
      token: string,
      platform: 'ios' | 'android',
    ): Promise<void> => {
      try {
        console.log('[NativePush:PWA] calling registerDevice: platform =', platform);
        addLog(`Calling registerDevice: platform=${platform}`);
        await registerDevice({ token, platform });
        console.log('[NativePush:PWA] registerDevice: success');
        addLog(`registerDevice: success`);
        setIsRegisteredOnBackend(true);
        setIsUnauthenticated(false);
        setLastError(undefined);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('[NativePush:PWA] registerDevice: failed', error);
        addLog(`registerDevice failed: ${errorMessage}`, error);
        setIsRegisteredOnBackend(false);

        const isAuthError =
          errorMessage.toLowerCase().includes('user not authenticated') ||
          errorMessage.toLowerCase().includes('user not found') ||
          errorMessage.toLowerCase().includes('forbidden') ||
          errorMessage.toLowerCase().includes('unauthorized');

        if (isAuthError) {
          setIsUnauthenticated(true);
          setLastError(undefined);
        } else {
          setLastError(`registerDevice error: ${errorMessage}`);
        }

        if (error instanceof Error) {
          try {
            const { default: ph } = await import('posthog-js');
            ph.capture('native_push_register_error', { error: error.message });
          } catch (importError) {
            console.error('Failed to load posthog-js', importError);
          }
        }
      }
    };

    const handleUnregisterDevice = async (
      token: string,
      platform: 'ios' | 'android',
    ): Promise<void> => {
      try {
        console.log('[NativePush:PWA] calling unregisterDevice: platform =', platform);
        addLog(`Calling unregisterDevice: platform=${platform}`);
        await unregisterDevice({ token, platform });
        console.log('[NativePush:PWA] unregisterDevice: success');
        addLog(`unregisterDevice: success`);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('[NativePush:PWA] unregisterDevice: failed', error);
        addLog(`unregisterDevice failed: ${errorMessage}`);
      }
    };

    const handleNativeEvent = (event: Event): void => {
      const customEvent = event as CustomEvent<NativePushEventDetail | null | undefined>;
      const detail = customEvent.detail ?? {};
      const type = detail.type;
      const payload = detail.payload ?? {};

      console.log('[NativePush:PWA] event received:', type);
      addLog(`Event received: ${type ?? 'unknown'}`, payload);

      switch (type) {
        case 'native-push-ready': {
          console.log('[NativePush:PWA] bridge ready, requesting status');
          setIsNativeApp(true);
          nativePushBridge.getStatus();
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

            let normalizedStatus: NativePushStatus = 'unknown';
            switch (statusValue) {
              case 'authorized':
              case 'granted':
              case 'provisional': {
                normalizedStatus = 'granted';
                break;
              }
              case 'denied': {
                normalizedStatus = 'denied';
                break;
              }
              case 'not-determined':
              case 'prompt': {
                normalizedStatus = 'prompt';
                break;
              }
            }

            setStatus(normalizedStatus);
            setHasToken(hasTokenValue);
            setLastError(undefined);
          }
          break;
        }
        case 'native-push-token': {
          const token = payload['token'];
          const platform = payload['platform'];
          console.log('[NativePush:PWA] token received: platform =', platform);
          if (typeof token === 'string' && typeof platform === 'string') {
            void handleRegisterDevice(token, platform as 'ios' | 'android');
            setStatus('granted');
            setHasToken(true);
            setLastError(undefined);
          }
          break;
        }
        case 'native-push-token-deleted': {
          if (rollbackTimeoutReference.current) {
            clearTimeout(rollbackTimeoutReference.current);
            rollbackTimeoutReference.current = undefined;
          }
          const token = payload['token'];
          const platform = payload['platform'];
          console.log('[NativePush:PWA] token deleted: platform =', platform);
          if (typeof token === 'string' && typeof platform === 'string') {
            void handleUnregisterDevice(token, platform as 'ios' | 'android');
          }
          setHasToken(false);
          setStatus('prompt');
          setLastError(undefined);
          break;
        }
        case 'native-push-open': {
          let targetPath = '/app/dashboard';
          if (typeof payload['url'] === 'string' && payload['url'].trim() !== '') {
            const rawUrl = payload['url'].trim();
            if (rawUrl.startsWith('/') && !rawUrl.startsWith('//')) {
              targetPath = rawUrl;
            } else {
              try {
                const parsedUrl = new URL(rawUrl, globalThis.location.origin);
                targetPath = parsedUrl.pathname + parsedUrl.search;
              } catch {
                console.warn(
                  '[NativePush:PWA] Could not parse URL, falling back to /app/dashboard:',
                  rawUrl,
                );
              }
            }
          }
          console.log('[NativePush:PWA] notification opened, navigating to:', targetPath);
          router.push(targetPath);
          break;
        }
        case 'native-push-error': {
          const rawError = payload['error'];
          const errorDetail =
            typeof rawError === 'string'
              ? rawError
              : JSON.stringify(rawError ?? 'Unknown native bridge error');
          console.error('[NativePush:PWA] bridge error:', payload['error']);
          addLog(`Bridge error: ${errorDetail}`);
          setLastError(errorDetail);
          setStatus((previous) => (previous === 'unknown' ? 'prompt' : previous));
          if (rollbackTimeoutReference.current) {
            clearTimeout(rollbackTimeoutReference.current);
            rollbackTimeoutReference.current = undefined;
            nativePushBridge.getStatus();
          }
          import('posthog-js')
            .then(({ default: ph }) => {
              ph.capture('native_push_error', { error: payload['error'] });
            })
            .catch((importError: unknown) => {
              console.error('Failed to load posthog-js', importError);
            });
          break;
        }
      }
    };

    globalThis.addEventListener('app-webview-native-push-event', handleNativeEvent);

    // Initial status check
    console.log('[NativePush:PWA] requesting initial status');
    nativePushBridge.getStatus();

    // Fallback timeout to prevent infinite loading spinner if bridge status response is delayed/lost
    const statusTimeoutId = setTimeout(() => {
      setStatus((previous) => {
        if (previous === 'unknown') {
          addLog('Status request timed out after 4s, falling back to prompt state');
          return 'prompt';
        }
        return previous;
      });
    }, 4000);

    return (): void => {
      clearTimeout(timeoutId);
      clearTimeout(statusTimeoutId);
      if (rollbackTimeoutReference.current) {
        clearTimeout(rollbackTimeoutReference.current);
      }
      globalThis.removeEventListener('app-webview-native-push-event', handleNativeEvent);
    };
  }, [router, registerDevice, unregisterDevice]);

  const requestPermission = (): void => {
    addLog('requestPermission() called');
    setLastError(undefined);
    if (isNativeApp) {
      console.log('[NativePush:PWA] requestPermission called');
      nativePushBridge.requestPermission();
    }
  };

  const deleteToken = (): void => {
    addLog('deleteToken() called');
    setLastError(undefined);
    if (isNativeApp) {
      console.log('[NativePush:PWA] deleteToken called');
      if (rollbackTimeoutReference.current) {
        clearTimeout(rollbackTimeoutReference.current);
      }

      const previousHasToken = hasToken;
      const previousStatus = status;

      setHasToken(false);
      setStatus('prompt');

      rollbackTimeoutReference.current = setTimeout(() => {
        console.warn('[NativePush:PWA] deleteToken timeout: rolling back optimistic update');
        addLog('deleteToken timeout: rolling back optimistic update');
        setHasToken(previousHasToken);
        setStatus(previousStatus);
      }, 5000);

      nativePushBridge.deleteToken();
    }
  };

  const openSettings = (): void => {
    addLog('openSettings() called');
    setLastError(undefined);
    if (isNativeApp) {
      console.log('[NativePush:PWA] openSettings called');
      nativePushBridge.openSettings();
    }
  };

  return {
    isNativeApp,
    status,
    hasToken,
    isRegisteredOnBackend,
    isUnauthenticated,
    requestPermission,
    deleteToken,
    openSettings,
    logs,
    lastError,
  };
}
