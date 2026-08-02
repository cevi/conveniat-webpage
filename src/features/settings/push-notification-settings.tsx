'use client';

import { Switch } from '@/components/ui/switch';
import { SettingsRow } from '@/features/settings/components/settings-row';
import { useNativePush } from '@/hooks/use-native-push';
import { usePushNotificationState } from '@/hooks/use-push-notification-state';
import type { Locale, StaticTranslationString } from '@/types/types';
import { Bell, Bug, Check, Share2, X } from 'lucide-react';
import React, { useCallback, useState } from 'react';

const pushNotificationSettingsTitle: StaticTranslationString = {
  de: 'Push-Benachrichtigungen',
  en: 'Push Notifications',
  fr: 'Notifications Push',
};

const pushNotificationDescription: StaticTranslationString = {
  de: 'Erhalte wichtige Updates',
  en: 'Get important updates',
  fr: 'Recevez des mises à jour importantes',
};

const notSupportedText: StaticTranslationString = {
  de: 'Nicht unterstützt',
  en: 'Not supported',
  fr: 'Non supporté',
};

export const PushNotificationSettings: React.FC<{ locale: Locale }> = ({ locale }) => {
  const {
    isSupported: isWebSupported,
    isSubscribed: isWebSubscribed,
    isLoading: isWebLoading,
    errorMessage: webError,
    toggleSubscription,
  } = usePushNotificationState({ registrationSource: '/app/settings', locale });

  const {
    isNativeApp,
    status,
    hasToken,
    requestPermission,
    deleteToken,
    openSettings,
    logs: nativeLogs,
    lastError: nativeLastError,
  } = useNativePush();

  const [isDevelopmentDebugMode, setIsDevelopmentDebugMode] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [clickTimestamps, setClickTimestamps] = useState<number[]>([]);
  const [userLogs, setUserLogs] = useState<
    Array<{ id: string; timestamp: string; message: string }>
  >([]);

  const addLog = useCallback((message: string) => {
    const time = new Date().toLocaleTimeString('en-GB', { hour12: false });
    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: time,
      message,
    };
    setUserLogs((previous) => [...previous.slice(-29), entry]);
  }, []);

  const handleTap = useCallback(() => {
    const now = Date.now();
    const recent = clickTimestamps.filter((t) => now - t < 2000);
    const updated = [...recent, now];
    setClickTimestamps(updated);

    if (updated.length >= 5) {
      setIsDevelopmentDebugMode(true);
      addLog('Dev mode activated (5 taps within 2s)');
    }
  }, [clickTimestamps, addLog]);

  const isNativeSupported = true; // WebView bridge handles support
  const isNativeSubscribed = hasToken && status === 'granted';
  const isNativeLoading = status === 'unknown';

  const isSupported = isNativeApp ? isNativeSupported : isWebSupported;
  const isSubscribed = isNativeApp ? isNativeSubscribed : isWebSubscribed;
  const isLoading = isNativeApp ? isNativeLoading : isWebLoading;
  const errorMessage = isNativeApp ? nativeLastError : webError;

  const handleToggle = (): void => {
    addLog(
      `Toggle pressed: isNativeApp=${String(isNativeApp)}, isSubscribed=${String(isSubscribed)}`,
    );
    if (isNativeApp) {
      if (isNativeSubscribed) {
        addLog('Calling deleteToken()');
        deleteToken();
      } else {
        if (status === 'denied') {
          addLog('Status is denied, calling openSettings()');
          openSettings();
        } else {
          addLog('Calling requestPermission()');
          requestPermission();
        }
      }
    } else {
      addLog('Calling toggleSubscription()');
      toggleSubscription()
        .then((response) => addLog(`toggleSubscription result=${String(response)}`))
        .catch((error: unknown) => addLog(`toggleSubscription error: ${String(error)}`));
    }
  };

  const isBridgePresent =
    typeof globalThis !== 'undefined' && globalThis.AppWebViewNativePush !== undefined;
  const notificationPermission =
    typeof globalThis !== 'undefined' && 'Notification' in globalThis
      ? globalThis.Notification.permission
      : 'N/A';
  const userAgent =
    typeof globalThis !== 'undefined' && 'navigator' in globalThis
      ? globalThis.navigator.userAgent
      : 'N/A';
  const activeError = errorMessage ?? nativeLastError ?? webError;

  const handleShareDebugData = useCallback(async () => {
    const combinedLogs = [
      ...userLogs,
      ...nativeLogs.map((n) => ({
        id: n.id,
        timestamp: n.timestamp,
        message: n.message,
        data: n.data,
      })),
    ].sort((a, b) => a.id.localeCompare(b.id));

    const debugData = {
      exportedAt: new Date().toISOString(),
      environment: isNativeApp ? 'Native WebView (KonektaApp)' : 'Web Browser',
      isNativeApp,
      isBridgePresent,
      nativeStatus: status,
      hasToken,
      isWebSupported,
      isWebSubscribed,
      browserPermission: notificationPermission,
      isLoading,
      activeError: activeError ?? null,
      userAgent,
      logs: combinedLogs,
    };

    const jsonString = JSON.stringify(debugData, null, 2);

    try {
      if (
        typeof navigator !== 'undefined' &&
        'share' in navigator &&
        typeof navigator.share === 'function'
      ) {
        await navigator.share({
          title: 'Push Notification Debug Log',
          text: jsonString,
        });
      } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(jsonString);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      }
    } catch {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(jsonString);
          setIsCopied(true);
          setTimeout(() => setIsCopied(false), 2000);
        } catch (copyError) {
          console.error('Failed to copy debug data', copyError);
        }
      }
    }
  }, [
    userLogs,
    nativeLogs,
    isNativeApp,
    isBridgePresent,
    status,
    hasToken,
    isWebSupported,
    isWebSubscribed,
    notificationPermission,
    isLoading,
    activeError,
    userAgent,
  ]);

  return (
    <div onClick={handleTap} className="select-none">
      <SettingsRow
        icon={Bell}
        title={pushNotificationSettingsTitle[locale]}
        subtitle={isSupported ? pushNotificationDescription[locale] : notSupportedText[locale]}
        error={errorMessage}
        action={
          <Switch
            checked={isSubscribed}
            onCheckedChange={handleToggle}
            disabled={!isSupported || isLoading || !!errorMessage}
            loading={isLoading}
          />
        }
      >
        {isDevelopmentDebugMode && (
          <div
            className="mt-4 rounded-xl border border-gray-200 bg-gray-900 p-4 font-mono text-xs text-gray-100 shadow-lg dark:border-gray-800"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between border-b border-gray-800 pb-2">
              <div className="flex items-center gap-2 font-bold text-amber-400">
                <Bug className="h-4 w-4" />
                <span>Push Notification Debug Mode</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    void handleShareDebugData();
                  }}
                  className="flex items-center gap-1 rounded bg-gray-800 px-2 py-1 text-[11px] text-amber-400 hover:bg-gray-700 hover:text-amber-300"
                  title="Share / Copy JSON Debug Payload"
                >
                  {isCopied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-green-400" />
                      <span className="text-green-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="h-3.5 w-3.5" />
                      <span>Share</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setIsDevelopmentDebugMode(false)}
                  className="rounded p-1 text-gray-400 hover:bg-gray-800 hover:text-gray-200"
                  title="Close Debug Panel"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mb-3 grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-gray-400">Environment: </span>
                <span className={isNativeApp ? 'font-semibold text-green-400' : 'text-blue-400'}>
                  {isNativeApp ? 'Native WebView (KonektaApp)' : 'Web Browser'}
                </span>
              </div>
              <div>
                <span className="text-gray-400">Bridge Defined: </span>
                <span className={isBridgePresent ? 'text-green-400' : 'text-red-400'}>
                  {String(isBridgePresent)}
                </span>
              </div>
              <div>
                <span className="text-gray-400">Native Status: </span>
                <span className="font-semibold text-amber-300">{status}</span>
              </div>
              <div>
                <span className="text-gray-400">Has Token: </span>
                <span className={hasToken ? 'text-green-400' : 'text-red-400'}>
                  {String(hasToken)}
                </span>
              </div>
              <div>
                <span className="text-gray-400">Web Supported: </span>
                <span>{String(isWebSupported)}</span>
              </div>
              <div>
                <span className="text-gray-400">Web Subscribed: </span>
                <span>{String(isWebSubscribed)}</span>
              </div>
              <div>
                <span className="text-gray-400">Browser Permission: </span>
                <span>{notificationPermission}</span>
              </div>
              <div>
                <span className="text-gray-400">Is Loading: </span>
                <span>{String(isLoading)}</span>
              </div>
            </div>

            {activeError && (
              <div className="mb-3 rounded border border-red-800 bg-red-950/80 p-2 text-red-300">
                <span className="font-bold">Active Error: </span>
                {activeError}
              </div>
            )}

            <div className="mb-2 border-b border-gray-800 pb-1 font-semibold text-gray-400">
              User Agent:
            </div>
            <div className="mb-3 rounded bg-gray-950 p-1.5 text-[10px] break-all text-gray-400">
              {userAgent}
            </div>

            <div className="mb-2 flex items-center justify-between border-b border-gray-800 pb-1 font-semibold text-gray-400">
              <span>Event & Execution Logs:</span>
              <button
                type="button"
                onClick={() => setUserLogs([])}
                className="text-[10px] text-amber-400 hover:underline"
              >
                Clear
              </button>
            </div>

            <div className="max-h-48 space-y-1 overflow-y-auto rounded bg-gray-950 p-2 text-[11px]">
              {userLogs.length === 0 && nativeLogs.length === 0 ? (
                <div className="text-gray-500 italic">
                  No events logged yet. Tap toggle to test.
                </div>
              ) : (
                [
                  ...userLogs,
                  ...nativeLogs.map((n) => ({
                    id: n.id,
                    timestamp: n.timestamp,
                    message: n.message,
                  })),
                ]
                  .sort((a, b) => a.id.localeCompare(b.id))
                  .map((log) => (
                    <div key={log.id} className="flex gap-2">
                      <span className="shrink-0 text-gray-500">[{log.timestamp}]</span>
                      <span className="break-all">{log.message}</span>
                    </div>
                  ))
              )}
            </div>

            <div className="mt-3 flex flex-wrap gap-2 border-t border-gray-800 pt-2">
              <button
                type="button"
                onClick={() => {
                  void handleShareDebugData();
                }}
                className="flex items-center gap-1 rounded bg-amber-600 px-2.5 py-1 text-[11px] font-semibold text-black hover:bg-amber-500"
              >
                {isCopied ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>Copied JSON!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="h-3.5 w-3.5" />
                    <span>Share Debug JSON</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  addLog('Manual test: requestPermission()');
                  requestPermission();
                }}
                className="rounded bg-gray-800 px-2 py-1 text-[11px] text-gray-200 hover:bg-gray-700"
              >
                Request Permission
              </button>
              <button
                type="button"
                onClick={() => {
                  addLog('Manual test: deleteToken()');
                  deleteToken();
                }}
                className="rounded bg-gray-800 px-2 py-1 text-[11px] text-gray-200 hover:bg-gray-700"
              >
                Delete Token
              </button>
              <button
                type="button"
                onClick={() => {
                  addLog('Manual test: openSettings()');
                  openSettings();
                }}
                className="rounded bg-gray-800 px-2 py-1 text-[11px] text-gray-200 hover:bg-gray-700"
              >
                Open Settings
              </button>
            </div>
          </div>
        )}
      </SettingsRow>
    </div>
  );
};
