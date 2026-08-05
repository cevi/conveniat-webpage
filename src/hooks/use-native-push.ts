'use client';

import { trpc, useOptionalTrpcUtils } from '@/trpc/client';
import { Cookie } from '@/types/types';
import { refreshAndOptimisticallyUpdateChat } from '@/utils/push-query-refresher';
import { isNativeAppWebView } from '@/utils/standalone-check';
import Cookies from 'js-cookie';
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

export function extractTargetUrl(payload: Record<string, unknown>): string | undefined {
  const notificationObject = payload['notification'] as Record<string, unknown> | undefined;
  const apsObject = (payload['aps'] ?? notificationObject?.['aps']) as
    Record<string, unknown> | undefined;
  const alertObject = (apsObject?.['alert'] ?? notificationObject?.['alert']) as
    Record<string, unknown> | undefined;
  const userInfoObject = (payload['userInfo'] ?? notificationObject?.['userInfo']) as
    Record<string, unknown> | undefined;

  const candidates: (Record<string, unknown> | undefined)[] = [
    payload,
    payload['data'] as Record<string, unknown> | undefined,
    notificationObject,
    notificationObject?.['data'] as Record<string, unknown> | undefined,
    apsObject,
    alertObject,
    userInfoObject,
  ];

  // First pass: Check for explicit chatId across all candidates
  for (const object_ of candidates) {
    if (!object_ || typeof object_ !== 'object') continue;

    const chatId: unknown = object_['chatId'];
    if (typeof chatId === 'string' && chatId.trim() !== '') {
      return `/app/chat/${chatId.trim()}`;
    }
    if (typeof chatId === 'number') {
      return `/app/chat/${String(chatId)}`;
    }
  }

  // Second pass: Check for explicit URL / path properties
  for (const object_ of candidates) {
    if (!object_ || typeof object_ !== 'object') continue;

    for (const key of ['redirectTo', 'url', 'path', 'link', 'target']) {
      const val: unknown = object_[key];
      if (typeof val === 'string' && val.trim() !== '') {
        return val.trim();
      }
    }
  }

  return undefined;
}

export function performReliablePushNavigation(
  router: { push: (url: string) => void },
  targetPath: string,
): void {
  if (typeof targetPath !== 'string' || targetPath.trim() === '') return;

  const cleanPath = targetPath.trim();

  try {
    sessionStorage.setItem('pending_push_redirect', cleanPath);
    localStorage.setItem('pending_push_redirect', cleanPath);
  } catch {
    // ignore storage errors
  }

  console.log('[NativePush:PWA] Performing reliable navigation to:', cleanPath);

  try {
    router.push(cleanPath);
  } catch (error: unknown) {
    console.warn('[NativePush:PWA] Soft router.push failed:', error);
  }

  // Backup check: perform hard location redirect if router hasn't updated pathname after 250ms
  setTimeout(() => {
    const currentPathname = globalThis.location.pathname;
    let targetChatId: string | undefined;
    if (cleanPath.includes('/app/chat/')) {
      const parts = cleanPath.split('/app/chat/');
      const firstPart = parts[1];
      if (typeof firstPart === 'string' && firstPart !== '') {
        targetChatId = firstPart.split('?')[0];
      }
    }

    const isAlreadyOnChat =
      typeof targetChatId === 'string' &&
      targetChatId !== '' &&
      currentPathname.includes(`/app/chat/${targetChatId}`);

    const isAlreadyOnExactPath = currentPathname === cleanPath;

    if (!isAlreadyOnChat && !isAlreadyOnExactPath) {
      console.log(
        '[NativePush:PWA] Soft navigation pending, executing location fallback to:',
        cleanPath,
      );
      globalThis.location.href = cleanPath;
    }
  }, 250);
}

export function checkAndExecutePendingPushNavigation(router: {
  push: (url: string) => void;
}): void {
  try {
    const pendingPath =
      sessionStorage.getItem('pending_push_redirect') ??
      localStorage.getItem('pending_push_redirect');

    if (typeof pendingPath !== 'string' || pendingPath.trim() === '') return;

    const cleanPath = pendingPath.trim();
    const currentPathname = globalThis.location.pathname;

    let targetChatId: string | undefined;
    if (cleanPath.includes('/app/chat/')) {
      const parts = cleanPath.split('/app/chat/');
      const firstPart = parts[1];
      if (typeof firstPart === 'string' && firstPart !== '') {
        targetChatId = firstPart.split('?')[0];
      }
    }

    const isAlreadyOnChat =
      typeof targetChatId === 'string' &&
      targetChatId !== '' &&
      currentPathname.includes(`/app/chat/${targetChatId}`);

    const isAlreadyOnExactPath = currentPathname === cleanPath;

    if (isAlreadyOnChat || isAlreadyOnExactPath) {
      sessionStorage.removeItem('pending_push_redirect');
      localStorage.removeItem('pending_push_redirect');
      return;
    }

    console.log('[NativePush:PWA] Executing pending push navigation to:', cleanPath);
    try {
      router.push(cleanPath);
    } catch {
      // ignore soft error
    }

    setTimeout(() => {
      const nowPathname = globalThis.location.pathname;
      const nowOnChat =
        typeof targetChatId === 'string' &&
        targetChatId !== '' &&
        nowPathname.includes(`/app/chat/${targetChatId}`);
      const nowOnExact = nowPathname === cleanPath;

      if (!nowOnChat && !nowOnExact) {
        console.log('[NativePush:PWA] Fallback location redirect to:', cleanPath);
        globalThis.location.href = cleanPath;
      } else {
        sessionStorage.removeItem('pending_push_redirect');
        localStorage.removeItem('pending_push_redirect');
      }
    }, 250);
  } catch {
    // ignore storage errors
  }
}

export function extractNotificationTitleAndBody(payload: Record<string, unknown>): {
  title: string;
  body: string;
} {
  const notificationObject = payload['notification'] as Record<string, unknown> | undefined;
  const dataObject = payload['data'] as Record<string, unknown> | undefined;
  const apsObject = (payload['aps'] ?? notificationObject?.['aps']) as
    Record<string, unknown> | undefined;
  const alertObject = (apsObject?.['alert'] ?? notificationObject?.['alert']) as
    Record<string, unknown> | undefined;
  const userInfoObject = (payload['userInfo'] ?? notificationObject?.['userInfo']) as
    Record<string, unknown> | undefined;

  const candidates: (Record<string, unknown> | undefined)[] = [
    payload,
    dataObject,
    notificationObject,
    notificationObject?.['data'] as Record<string, unknown> | undefined,
    apsObject,
    alertObject,
    userInfoObject,
  ];

  let title = 'Neue Nachricht';
  let body = '';

  for (const object_ of candidates) {
    if (!object_ || typeof object_ !== 'object') continue;

    const titleValue = object_['title'];
    if (typeof titleValue === 'string' && titleValue.trim() !== '') {
      title = titleValue.trim();
      break;
    }
  }

  for (const object_ of candidates) {
    if (!object_ || typeof object_ !== 'object') continue;

    for (const key of ['body', 'message', 'content', 'text']) {
      const value = object_[key];
      if (typeof value === 'string' && value.trim() !== '') {
        body = value.trim();
        break;
      }
    }
    if (body !== '') break;
  }

  return { title, body };
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
  const trpcUtils = useOptionalTrpcUtils();
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

    const initTimeoutId = setTimeout(() => {
      setIsNativeApp(isNative && isBridgeReady);
      addLog(`Hook mounted: isNative=${String(isNative)}, bridgeReady=${String(isBridgeReady)}`);
      addLog('Requesting initial status via getStatus()');
    }, 0);

    if (!isNative) return (): void => clearTimeout(initTimeoutId);

    const handleRegisterDevice = async (
      token: string,
      platform: 'ios' | 'android',
    ): Promise<void> => {
      try {
        console.log('[NativePush:PWA] calling registerDevice: platform =', platform);
        addLog(`Calling registerDevice: platform=${platform}`);
        const { getOrCreateDeviceId } = await import('@/utils/device-id');
        const deviceId = getOrCreateDeviceId();
        await registerDevice({ token, platform, deviceId });
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
          const rawUrl = extractTargetUrl(payload);

          if (typeof rawUrl === 'string' && rawUrl !== '') {
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

          let targetChatId: string | undefined;
          if (targetPath.includes('/app/chat/')) {
            const parts = targetPath.split('/app/chat/');
            const firstPart = parts[1];
            if (typeof firstPart === 'string' && firstPart !== '') {
              targetChatId = firstPart.split('?')[0];
            }
          }
          refreshAndOptimisticallyUpdateChat(trpcUtils, targetChatId, payload);

          console.log('[NativePush:PWA] notification opened, navigating to:', targetPath);
          performReliablePushNavigation(router, targetPath);
          break;
        }
        case 'native-push-received':
        case 'native-push-message':
        case 'push-received':
        case 'notification': {
          const rawUrl = extractTargetUrl(payload);
          let targetChatId: string | undefined;

          if (typeof rawUrl === 'string' && rawUrl.includes('/app/chat/')) {
            const parts = rawUrl.split('/app/chat/');
            const firstPart = parts[1];
            if (typeof firstPart === 'string' && firstPart !== '') {
              targetChatId = firstPart.split('?')[0];
            }
          }

          // Refresh query cache in background
          refreshAndOptimisticallyUpdateChat(trpcUtils, targetChatId, payload);

          // Check if current user is actively viewing this exact chat details page
          const currentPathname = globalThis.location.pathname;
          const isCurrentChatOpen =
            typeof targetChatId === 'string' &&
            targetChatId !== '' &&
            currentPathname.includes(`/app/chat/${targetChatId}`);

          if (!isCurrentChatOpen) {
            const { title: notificationTitle, body: notificationBody } =
              extractNotificationTitleAndBody(payload);

            let targetPath = '/app/dashboard';
            if (typeof rawUrl === 'string' && rawUrl !== '') {
              if (rawUrl.startsWith('/') && !rawUrl.startsWith('//')) {
                targetPath = rawUrl;
              } else {
                try {
                  const parsedUrl = new URL(rawUrl, globalThis.location.origin);
                  targetPath = parsedUrl.pathname + parsedUrl.search;
                } catch {
                  // Fall back if parse fails
                }
              }
            }
            if (
              targetPath === '/app/dashboard' &&
              typeof targetChatId === 'string' &&
              targetChatId.trim() !== ''
            ) {
              targetPath = `/app/chat/${targetChatId.trim()}`;
            }

            const notificationApi = (
              globalThis as unknown as { Notification?: typeof Notification }
            ).Notification;
            if (notificationApi?.permission === 'granted') {
              try {
                const nativeNotification = new globalThis.Notification(notificationTitle, {
                  body: notificationBody,
                  icon: '/favicon.svg',
                  data: { targetPath },
                });
                nativeNotification.addEventListener('click', () => {
                  globalThis.focus();
                  router.push(targetPath);
                });
              } catch (notificationError: unknown) {
                console.warn(
                  '[NativePush:PWA] Could not trigger native system notification:',
                  notificationError,
                );
              }
            }
          }
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
          }
          break;
        }
      }
    };

    const handleAppResume = (): void => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        checkAndExecutePendingPushNavigation(router);
        if (nativePushBridge.isSupported()) {
          console.log('[NativePush:PWA] app resumed, requesting updated status');
          nativePushBridge.getStatus();
        }
      }
    };

    checkAndExecutePendingPushNavigation(router);

    globalThis.addEventListener('app-webview-native-push-event', handleNativeEvent);
    if (typeof document !== 'undefined') {
      document.addEventListener('app-webview-native-push-event', handleNativeEvent);
    }
    globalThis.addEventListener('visibilitychange', handleAppResume);
    globalThis.addEventListener('focus', handleAppResume);
    globalThis.addEventListener('pageshow', handleAppResume);

    nativePushBridge.getStatus();

    const statusTimeoutId = setTimeout(() => {
      setStatus((previous) => {
        if (previous === 'unknown') {
          console.log('[NativePush:PWA] status timeout: assuming prompt');
          return 'prompt';
        }
        return previous;
      });
    }, 4000);

    return (): void => {
      clearTimeout(initTimeoutId);
      clearTimeout(statusTimeoutId);
      if (rollbackTimeoutReference.current) {
        clearTimeout(rollbackTimeoutReference.current);
      }
      globalThis.removeEventListener('app-webview-native-push-event', handleNativeEvent);
      if (typeof document !== 'undefined') {
        document.removeEventListener('app-webview-native-push-event', handleNativeEvent);
      }
      globalThis.removeEventListener('visibilitychange', handleAppResume);
      globalThis.removeEventListener('focus', handleAppResume);
      globalThis.removeEventListener('pageshow', handleAppResume);
    };
  }, [router, registerDevice, unregisterDevice, trpcUtils]);

  const requestPermission = (): void => {
    Cookies.remove(Cookie.SKIP_PUSH_NOTIFICATION);
    addLog('requestPermission() called');
    setLastError(undefined);
    if (isNativeApp || nativePushBridge.isSupported()) {
      console.log('[NativePush:PWA] requestPermission called');
      nativePushBridge.requestPermission();
      setTimeout(() => nativePushBridge.getStatus(), 500);
      setTimeout(() => nativePushBridge.getStatus(), 1500);
      setTimeout(() => nativePushBridge.getStatus(), 3000);
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
    Cookies.remove(Cookie.SKIP_PUSH_NOTIFICATION);
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
