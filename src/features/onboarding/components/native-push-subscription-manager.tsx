'use client';

import { Button } from '@/components/ui/buttons/button';
import { IconTile } from '@/components/ui/icon-tile';
import {
  OnboardingNotice,
  OnboardingStepScreen,
} from '@/features/onboarding/components/onboarding-step';
import {
  pushNotificationReason,
  pushNotificationTitle,
} from '@/features/onboarding/onboarding-constants';
import type { StaticTranslationString } from '@/types/types';
import { Cookie } from '@/types/types';
import Cookies from 'js-cookie';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';

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

/**
 * Enabling push here overrides an opt-out made earlier in the settings, which is kept
 * across logouts. Left in place, the app would never register the token the user just
 * allowed. Imported on demand to keep the database library out of the onboarding bundle.
 */
const clearPushOptOut = (): void => {
  void import('@/lib/preferences')
    .then(({ writePreference }) => writePreference('native-push-opted-out', false))
    .catch((error: unknown) => console.warn('Failed to clear the push opt-out', error));
};

const handleOpenSettings = (): void => {
  Cookies.remove(Cookie.SKIP_PUSH_NOTIFICATION);
  clearPushOptOut();
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
        const label = payload['authorizationLabel'] ?? payload['status'];
        if (label === 'authorized' || label === 'granted' || label === 'provisional') {
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
    if (typeof document !== 'undefined') {
      document.addEventListener('app-webview-native-push-event', handleEvent);
    }

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
    clearPushOptOut();
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
      <OnboardingStepScreen
        visual={<IconTile icon={BellOff} size="lg" />}
        title={pushNotificationTitle[locale]}
        description={pushNotificationReason[locale]}
        actions={
          <Button variant="primary" size="touch" onClick={handleOpenSettings}>
            {openSettingsButtonText[locale]}
          </Button>
        }
      >
        <OnboardingNotice tone="warning">{deniedText[locale]}</OnboardingNotice>
      </OnboardingStepScreen>
    );
  }

  return (
    <OnboardingStepScreen
      visual={<IconTile icon={Bell} size="lg" />}
      title={pushNotificationTitle[locale]}
      description={pushNotificationReason[locale]}
      actions={
        <Button
          variant="primary"
          size="touch"
          onClick={handleEnable}
          disabled={isRequesting}
          aria-busy={isRequesting}
          className="disabled:cursor-wait disabled:opacity-100"
        >
          {isRequesting && <Loader2 className="animate-spin" aria-hidden="true" />}
          {enableButtonText[locale]}
        </Button>
      }
    />
  );
};
