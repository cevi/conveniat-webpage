'use client';

import type { StaticTranslationString } from '@/types/types';
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

const skipButtonText: StaticTranslationString = {
  en: 'Skip for now',
  de: 'Überspringen',
  fr: "Passer pour l'instant",
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
  const callbackRef = useRef(callback);
  callbackRef.current = callback;
  const hasAdvancedRef = useRef(false);

  const advance = useCallback((): void => {
    if (!hasAdvancedRef.current) {
      hasAdvancedRef.current = true;
      setIsRequesting(false);
      callbackRef.current();
    }
  }, []);

  useEffect(() => {
    // Check current status on mount — auto-advances if already authorized
    globalThis.AppWebViewNativePush?.getStatus();

    const handleEvent = (event: Event): void => {
      const customEvent = event as CustomEvent<NativePushEventDetail | null>;
      const detail = customEvent.detail ?? {};
      const type = detail.type;
      const payload = detail.payload ?? {};

      if (type === 'native-push-status') {
        const label = payload['authorizationLabel'];
        if (label === 'authorized' || label === 'provisional') {
          advance();
        } else if (label === 'denied') {
          setIsRequesting(false);
          setIsDenied(true);
        } else {
          // not-determined or unknown — permission dialog dismissed without granting
          setIsRequesting(false);
        }
      } else if (type === 'native-push-token') {
        if (typeof payload['token'] === 'string') {
          advance();
        }
      }
    };

    globalThis.addEventListener('app-webview-native-push-event', handleEvent);
    return (): void => {
      globalThis.removeEventListener('app-webview-native-push-event', handleEvent);
    };
  }, [advance]);

  const handleEnable = (): void => {
    setIsRequesting(true);
    globalThis.AppWebViewNativePush?.requestPermission();
  };

  const handleOpenSettings = (): void => {
    globalThis.AppWebViewNativePush?.openSettings();
  };

  if (isDenied) {
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center justify-center rounded-lg bg-yellow-50 p-3 text-yellow-800">
          <span className="text-balance text-sm font-semibold">{deniedText[locale]}</span>
        </div>
        <button
          className="font-heading flex cursor-pointer items-center justify-center gap-2 rounded-[8px] bg-red-700 px-8 py-3 text-center text-lg leading-normal font-bold text-red-100 duration-100 hover:bg-red-800"
          onClick={handleOpenSettings}
        >
          {openSettingsButtonText[locale]}
        </button>
        <button
          className="cursor-pointer font-semibold text-gray-400 hover:text-gray-600"
          onClick={advance}
        >
          {skipButtonText[locale]}
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
