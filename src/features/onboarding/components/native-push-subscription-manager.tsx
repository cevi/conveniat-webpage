'use client';

import type { StaticTranslationString } from '@/types/types';
import { Cookie } from '@/types/types';
import Cookies from 'js-cookie';
import React, { useCallback, useEffect, useRef, useState } from 'react';

const descriptionText: StaticTranslationString = {
  en: 'You are not subscribed to push notifications.',
  de: 'Du bist nicht für Push-Benachrichtigungen angemeldet.',
  fr: "Vous n'êtes pas abonné aux notifications push.",
};

const enableButtonText: StaticTranslationString = {
  en: 'Enable Notifications',
  de: 'Benachrichtigungen aktivieren',
  fr: 'Activer les notifications',
};

const deniedText: StaticTranslationString = {
  en: 'Push notifications are blocked. Enable them in your device settings.',
  de: 'Push-Benachrichtigungen sind gesperrt. Bitte in den Geräteeinstellungen aktivieren.',
  fr: 'Les notifications push sont bloquées. Activez-les dans les paramètres de votre appareil.',
};

const openSettingsButtonText: StaticTranslationString = {
  en: 'Open Settings',
  de: 'Einstellungen öffnen',
  fr: 'Ouvrir les paramètres',
};

const handleOpenSettings = (): void => {
  Cookies.remove(Cookie.SKIP_PUSH_NOTIFICATION);
  globalThis.AppWebViewNativePush?.openSettings();
};

interface NativePushEventDetail {
  type?: string;
  payload?: Record<string, unknown>;
}

export const NativePushSubscriptionManager: React.FC<{
  callback: () => void;
  locale: 'de' | 'fr' | 'en';
}> = ({ callback, locale }) => {
  const [isRequesting, setIsRequesting] = useState(false);
  const [isDenied, setIsDenied] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const callbackReference = useRef(callback);
  const hasAdvancedReference = useRef(false);

  useEffect(() => {
    callbackReference.current = callback;
  }, [callback]);

  const advance = useCallback((): void => {
    if (!hasAdvancedReference.current) {
      hasAdvancedReference.current = true;
      setIsRequesting(false);
      callbackReference.current();
    }
  }, []);

  // Track whether this is the initial mount check vs returning from settings
  const isInitialMountReference = useRef(true);
  // Track whether the user explicitly tapped "Benachrichtigungen aktivieren"
  const userRequestedEnableReference = useRef(false);

  useEffect(() => {
    // Check current status on mount
    globalThis.AppWebViewNativePush?.getStatus();

    const handleEvent = (event: Event): void => {
      const customEvent = event as CustomEvent<NativePushEventDetail | null>;
      const detail = customEvent.detail ?? {};
      const type = detail.type;
      const payload = detail.payload ?? {};

      if (type === 'native-push-status') {
        const label = payload['authorizationLabel'];
        if (label === 'authorized' || label === 'provisional') {
          setIsDenied(false);
          setIsAuthorized(true);
          // Only auto-advance if it's initial mount check (already granted before onboarding)
          // OR if the user explicitly clicked "Benachrichtigungen aktivieren".
          // NEVER auto-advance when returning from Android system settings.
          if (isInitialMountReference.current || userRequestedEnableReference.current) {
            advance();
          }
        } else if (label === 'denied') {
          setIsRequesting(false);
          setIsDenied(true);
          setIsAuthorized(false);
        } else {
          // not-determined or unknown — permission dialog dismissed without granting
          setIsRequesting(false);
          setIsDenied(false);
          setIsAuthorized(false);
        }
        isInitialMountReference.current = false;
      } else if (type === 'native-push-token' && typeof payload['token'] === 'string') {
        setIsAuthorized(true);
        if (isInitialMountReference.current || userRequestedEnableReference.current) {
          advance();
        }
        isInitialMountReference.current = false;
      }
    };

    globalThis.addEventListener('app-webview-native-push-event', handleEvent);

    const handleFocus = (): void => {
      // Re-check status when user returns from settings (focus/visibility change)
      // isInitialMountReference is false, userRequestedEnableReference is false, so it will ONLY
      // update isDenied/isAuthorized UI state without calling advance().
      globalThis.AppWebViewNativePush?.getStatus();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return (): void => {
      globalThis.removeEventListener('app-webview-native-push-event', handleEvent);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [advance]);

  const handleEnable = (): void => {
    Cookies.remove(Cookie.SKIP_PUSH_NOTIFICATION);
    userRequestedEnableReference.current = true;
    if (isAuthorized) {
      advance();
    } else {
      setIsRequesting(true);
      globalThis.AppWebViewNativePush?.requestPermission();
    }
  };

  if (isDenied) {
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center justify-center rounded-lg bg-yellow-50 p-3 text-yellow-800">
          <span className="text-sm font-semibold text-balance">{deniedText[locale]}</span>
        </div>
        <button
          className="font-heading flex cursor-pointer items-center justify-center gap-2 rounded-[8px] bg-red-700 px-8 py-3 text-center text-lg leading-normal font-bold text-red-100 duration-100 hover:bg-red-800"
          onClick={handleOpenSettings}
        >
          {openSettingsButtonText[locale]}
        </button>
      </div>
    );
  }

  return (
    <div className="mb-0 flex flex-col items-center">
      <p className="mb-4 text-balance text-gray-700">{descriptionText[locale]}</p>
      <button
        className="font-heading flex cursor-pointer items-center justify-center gap-2 rounded-[8px] bg-red-700 px-8 py-3 text-center text-lg leading-normal font-bold text-red-100 duration-100 hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
        onClick={handleEnable}
        disabled={isRequesting}
      >
        {isRequesting && (
          <div className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-white border-t-transparent" />
        )}
        {enableButtonText[locale]}
      </button>
    </div>
  );
};
