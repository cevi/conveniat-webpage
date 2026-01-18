'use client';

import type { cookieInfoText } from '@/features/onboarding/onboarding-constants';
import { OnboardingStep } from '@/features/onboarding/types';
import { isSafariOnAppleDevice } from '@/utils/browser-detection';
import { getPushSubscription } from '@/utils/push-notifications/push-manager-utils';

import {
  initialOnboardingState,
  onboardingReducer,
} from '@/features/onboarding/state/onboarding-finite-state-machine';
// eslint-disable-next-line import/no-restricted-paths
import { CACHE_NAMES } from '@/features/service-worker/constants';
import { Cookie } from '@/types/types';
import { hasCookie, isCookieUnset } from '@/utils/cookie-utils';
import { DesignCodes, DesignModeTriggers } from '@/utils/design-codes';
import Cookies from 'js-cookie';
import { useSession } from 'next-auth/react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { Dispatch, SetStateAction } from 'react';
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';

const getInitialLocale = (): 'en' | 'de' | 'fr' => {
  // Always return 'de' initially to match the server-side default and avoid hydration mismatch.
  // The useEffect hook will update the locale to the user's preference (cookie/browser) immediately after mount.
  return 'de';
};

export const useOnboarding = (): UseOnboardingReturn => {
  const [locale, setLocale] = useState<keyof typeof cookieInfoText>(getInitialLocale);
  const [state, dispatch] = useReducer(onboardingReducer, initialOnboardingState);
  const { step: onboardingStep } = state; // Derived from FSM state for return
  const { status } = useSession();
  const searchParameters = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const isMounted = useRef(true);

  const [hasManuallyChangedLanguage, setHasManuallyChangedLanguage] = useState(() => {
    if (typeof globalThis === 'undefined') return false;
    return isCookieUnset(Cookie.LOCALE_COOKIE);
  });

  useEffect(() => {
    return (): void => {
      isMounted.current = false;
    };
  }, []);

  // Sync Auth Status & Cookies to FSM Context
  useEffect(() => {
    const hasAcceptedCookieBanner = hasCookie(Cookie.CONVENIAT_COOKIE_BANNER);
    const hasSkippedAuth = hasCookie(Cookie.HAS_SKIPPED_AUTH);
    const hasSkippedPush = hasCookie(Cookie.SKIP_PUSH_NOTIFICATION);
    const hasSkippedOffline = hasCookie(Cookie.SKIP_OFFLINE_CONTENT);

    dispatch({
      type: 'UPDATE_CONTEXT',
      payload: {
        hasAcceptedCookieBanner,
        authStatus: status,
        hasSkippedLogin: hasSkippedAuth,
        hasSkippedPush,
        hasSkippedOffline,
      },
    });
  }, [status, searchParameters]); // searchParameters included to re-check if query params clear cookies (handled below)

  // Clear skip auth cookie if signalled by query param
  useEffect(() => {
    if (searchParameters.get('clearSkip') === 'true') {
      Cookies.remove(Cookie.HAS_SKIPPED_AUTH);
      dispatch({
        type: 'UPDATE_CONTEXT',
        payload: { hasSkippedLogin: false },
      });
    }
  }, [searchParameters]);

  // Async Checks: Push Subscription & Offline Content
  useEffect(() => {
    const checkAsyncState = async (): Promise<void> => {
      // 1. Push Subscription
      let hasPushSubscription = false;
      let pushPermission: NotificationPermission = 'default';

      try {
        const subscription = await getPushSubscription();
        hasPushSubscription = !!subscription;
        if (typeof Notification !== 'undefined') {
          pushPermission = Notification.permission;
        }
      } catch (error) {
        console.warn('Failed to check push subscription', error);
      }

      // 2. Offline Content (DB)
      let offlineContentHandled = false;
      try {
        const { userPreferencesCollection } = await import('@/lib/tanstack-db');
        const handled = userPreferencesCollection.get('offline-content-handled');
        offlineContentHandled = !!handled;
      } catch (error) {
        console.warn('Failed to check offline preferences', error);
      }

      // 3. Cache Content
      let hasCachedContent = false;
      if (typeof caches !== 'undefined') {
        try {
          const pagesCache = await caches.open(CACHE_NAMES.PAGES);
          const keys = await pagesCache.keys();
          if (keys.length > 5) {
            hasCachedContent = true;
          }
        } catch (error) {
          console.warn('Failed to check cache', error);
        }
      }

      if (isMounted.current) {
        dispatch({
          type: 'UPDATE_CONTEXT',
          payload: {
            hasPushSubscription,
            pushPermission,
            offlineContentHandled,
            hasCachedContent,
          },
        });
      }
    };

    // Only run if we are past the initial checks to save resources, or run always?
    // Run always to be safe and reactive.
    void checkAsyncState();
  }, [status]); // Re-run on auth change as push sub might depend on user? (Usually not, but good trigger)

  // Network Status Listeners
  useEffect(() => {
    const updateOnlineStatus = (): void => {
      dispatch({
        type: 'UPDATE_CONTEXT',
        payload: { isOnline: navigator.onLine },
      });
    };

    globalThis.addEventListener('online', updateOnlineStatus);
    globalThis.addEventListener('offline', updateOnlineStatus);

    // Set initial status
    updateOnlineStatus();

    return (): void => {
      globalThis.removeEventListener('online', updateOnlineStatus);
      globalThis.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  const handleLanguageChange = useCallback((newLocale: string): void => {
    setLocale(newLocale as keyof typeof cookieInfoText);
    setHasManuallyChangedLanguage(true);
  }, []);

  const acceptCookiesCallback = useCallback((): void => {
    dispatch({ type: 'USER_ACTION_ACCEPT_COOKIES' });
  }, []);

  const handlePushNotification = useCallback((): void => {
    const hasSkipped = hasCookie(Cookie.SKIP_PUSH_NOTIFICATION);
    if (hasSkipped) {
      dispatch({ type: 'USER_ACTION_SKIP_PUSH' });
    } else {
      void getPushSubscription().then((sub) => {
        dispatch({
          type: 'UPDATE_CONTEXT',
          payload: { hasPushSubscription: !!sub },
        });
      });
    }
  }, []);

  // Design Mode Effect
  useEffect(() => {
    const forceAppMode = searchParameters.get(DesignModeTriggers.QUERY_PARAM_FORCE) === 'true';
    const isWebkitBasedBrowser = isSafariOnAppleDevice();
    if (forceAppMode || isWebkitBasedBrowser) {
      Cookies.set(Cookie.DESIGN_MODE, DesignCodes.APP_DESIGN, { expires: 730 });
      const params = new URLSearchParams(searchParameters.toString());
      params.delete(DesignModeTriggers.QUERY_PARAM_FORCE);
      router.replace(`${pathname}?${params.toString()}`);
    }
  }, [searchParameters, pathname, router]);

  // Sync locale state with cookie on mount to fix inconsistent selector or hydration mismatch
  useEffect(() => {
    // Force client-side read to ensure state matches browser reality
    const cookieLocale = Cookies.get(Cookie.LOCALE_COOKIE);
    let targetLocale: 'en' | 'de' | 'fr' = 'en';

    if (cookieLocale !== undefined && ['en', 'de', 'fr'].includes(cookieLocale)) {
      targetLocale = cookieLocale as 'en' | 'de' | 'fr';
    } else if (typeof navigator !== 'undefined') {
      const browserLang = navigator.language.split('-')[0];
      if (browserLang === 'en' || browserLang === 'de' || browserLang === 'fr') {
        targetLocale = browserLang;
      }
    }

    // Only update if different to prevent unnecessary renders, but vital for hydration fix
    setTimeout(() => {
      setLocale((current) => (current === targetLocale ? current : targetLocale));
      setHasManuallyChangedLanguage(true);
    }, 0);
  }, []);

  // Set the locale cookie
  useEffect(() => {
    if (hasManuallyChangedLanguage && onboardingStep >= OnboardingStep.Login) {
      Cookies.set(Cookie.LOCALE_COOKIE, locale, { expires: 730 });
    }
  }, [hasManuallyChangedLanguage, locale, onboardingStep]);

  // Handle Offline Content Step
  const handleOfflineContent = useCallback((accepted: boolean) => {
    // Store preference in TanStack DB
    void import('@/lib/tanstack-db').then(({ userPreferencesCollection }) => {
      userPreferencesCollection.insert({ key: 'offline-content-handled', value: true });
      if (accepted) {
        userPreferencesCollection.insert({ key: 'offline-content-accepted', value: true });
      } else {
        userPreferencesCollection.insert({ key: 'offline-content-accepted', value: false });
      }
    });

    // Store skip preference in cookies as well for a fast secondary check
    Cookies.set(Cookie.SKIP_OFFLINE_CONTENT, 'true', { expires: 730 });

    dispatch({ type: 'USER_ACTION_HANDLE_OFFLINE', accepted });
  }, []);

  const setOnboardingStep: Dispatch<SetStateAction<OnboardingStep>> = useCallback(() => {
    // Manual step forcing is ignored in favor of FSM context evaluation
    dispatch({ type: 'EVALUATE_NEXT_STEP' });
  }, []);

  // Redirect to dashboard when finished
  useEffect(() => {
    if (onboardingStep === OnboardingStep.Loading) {
      const shareText = searchParameters.get('text');
      const shareTitle = searchParameters.get('title');
      const shareUrl = searchParameters.get('url');

      if (shareText !== null || shareTitle !== null || shareUrl !== null) {
        const params = new URLSearchParams();
        if (shareText !== null) params.set('text', shareText);
        if (shareTitle !== null) params.set('title', shareTitle);
        if (shareUrl !== null) params.set('url', shareUrl);
        router.push(`/app/chat?${params.toString()}`);
      } else {
        router.push('/app/dashboard');
      }
    }
  }, [onboardingStep, router, searchParameters]);

  return {
    locale,
    onboardingStep,
    handleLanguageChange,
    acceptCookiesCallback,
    handlePushNotification,
    handleOfflineContent,
    setOnboardingStep,
  };
};

export interface UseOnboardingReturn {
  locale: keyof typeof cookieInfoText;
  onboardingStep: OnboardingStep;
  handleLanguageChange: (newLocale: string) => void;
  acceptCookiesCallback: () => void;
  handlePushNotification: () => void;
  handleOfflineContent: (accepted: boolean) => void;
  setOnboardingStep: Dispatch<SetStateAction<OnboardingStep>>;
}
