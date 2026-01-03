'use client';

import type { cookieInfoText } from '@/features/onboarding/onboarding-constants';
import { OnboardingStep } from '@/features/onboarding/types';
import { isSafariOnAppleDevice } from '@/utils/browser-detection';
import { getPushSubscription } from '@/utils/push-notifications/push-manager-utils';

// eslint-disable-next-line import/no-restricted-paths
import { CACHE_NAMES } from '@/features/service-worker/constants';
import { Cookie } from '@/types/types';
import { DesignCodes, DesignModeTriggers } from '@/utils/design-codes';
import Cookies from 'js-cookie';
import { useSession } from 'next-auth/react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { Dispatch, SetStateAction } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

const getInitialLocale = (): 'en' | 'de' | 'fr' => {
  // Always return 'de' initially to match the server-side default and avoid hydration mismatch.
  // The useEffect hook will update the locale to the user's preference (cookie/browser) immediately after mount.
  return 'de';
};

const getInitialOnboardingStep = (): OnboardingStep => {
  return OnboardingStep.Checking;
};

export const useOnboarding = (): UseOnboardingReturn => {
  const [locale, setLocale] = useState<keyof typeof cookieInfoText>(getInitialLocale);
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>(getInitialOnboardingStep);
  const { status } = useSession();
  const searchParameters = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const isMounted = useRef(true);

  const [hasManuallyChangedLanguage, setHasManuallyChangedLanguage] = useState(() => {
    if (typeof globalThis === 'undefined') return false;
    return Cookies.get(Cookie.LOCALE_COOKIE) === undefined;
  });

  useEffect(() => {
    return (): void => {
      isMounted.current = false;
    };
  }, []);

  const handleLanguageChange = useCallback((newLocale: string): void => {
    setLocale(newLocale as keyof typeof cookieInfoText);
    setHasManuallyChangedLanguage(true);
  }, []);

  const handlePushNotification = useCallback((): void => {
    setOnboardingStep(OnboardingStep.Loading);
    Cookies.remove(Cookie.HAS_LOGGED_IN);
  }, []);

  const acceptCookiesCallback = useCallback((): void => {
    if (status === 'authenticated') {
      void getPushSubscription()
        .then((subscription: PushSubscription | undefined): void => {
          if (!isMounted.current) return;
          const hasSkipped = Cookies.get(Cookie.SKIP_PUSH_NOTIFICATION) === 'true';
          const isDenied =
            typeof Notification !== 'undefined' && Notification.permission === 'denied';

          if (subscription || hasSkipped || isDenied) {
            handlePushNotification();
          } else {
            setOnboardingStep(OnboardingStep.PushNotifications);
          }
        })
        .catch((): void => {
          // If error checking subscription, default to showing push step or skipping strictly?
          // Safest is to show step, let user try/skip.
          setOnboardingStep(OnboardingStep.PushNotifications);
        });
    } else {
      setOnboardingStep(OnboardingStep.Login);
    }
  }, [status, handlePushNotification]);

  // Set the design-mode cookie if force-app-mode is present
  useEffect(() => {
    const forceAppMode = searchParameters.get(DesignModeTriggers.QUERY_PARAM_FORCE) === 'true';

    const isWebkitBasedBrowser = isSafariOnAppleDevice();
    if (forceAppMode || isWebkitBasedBrowser) {
      Cookies.set(Cookie.DESIGN_MODE, DesignCodes.APP_DESIGN, { expires: 730 });
      console.log('[Onboarding] Force Mode: Setting Cookie Client-side', {
        cookieName: Cookie.DESIGN_MODE,
        cookieValue: DesignCodes.APP_DESIGN,
      });

      const params = new URLSearchParams(searchParameters.toString());
      params.delete(DesignModeTriggers.QUERY_PARAM_FORCE);
      const queryString = params.toString();
      const newUrl = `${pathname}?${queryString}`;
      router.replace(newUrl);
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

    setOnboardingStep(OnboardingStep.Loading);
  }, []);

  // Check Onboarding State
  useEffect(() => {
    const checkOnboarding = async (): Promise<void> => {
      const hasAcceptedCookies = Cookies.get(Cookie.CONVENIAT_COOKIE_BANNER) === 'true';

      if (!hasAcceptedCookies) {
        if (isMounted.current) setOnboardingStep(OnboardingStep.Initial);
        return;
      }

      if (status === 'loading') return;

      if (status === 'authenticated') {
        try {
          const subscription = await getPushSubscription();
          if (!isMounted.current) return;

          const hasSkippedPush = Cookies.get(Cookie.SKIP_PUSH_NOTIFICATION) === 'true';
          const isDeniedPush =
            typeof Notification !== 'undefined' && Notification.permission === 'denied';

          if (!subscription && !hasSkippedPush && !isDeniedPush) {
            setOnboardingStep(OnboardingStep.PushNotifications);
            return;
          }

          // Check Offline Content Preference from TanStack DB
          const { userPreferencesCollection } = await import('@/lib/tanstack-db');
          const offlineHandled = userPreferencesCollection.get('offline-content-handled');

          // ALSO check if content is already cached (e.g. from previous session)
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

          if (!offlineHandled && !hasCachedContent) {
            setOnboardingStep(OnboardingStep.OfflineContent);
            return;
          }

          // If we have content but database is out of sync, sync it?
          if (hasCachedContent && !offlineHandled) {
            void userPreferencesCollection.insert({ key: 'offline-content-handled', value: true });
            void userPreferencesCollection.insert({ key: 'offline-content-accepted', value: true });
          }

          setOnboardingStep(OnboardingStep.Loading);
        } catch (error) {
          console.error('Onboarding check failed', error);
          // Default to dashboard on error to avoid active blocking
          setOnboardingStep(OnboardingStep.Loading);
        }
      } else {
        setTimeout(() => {
          if (isMounted.current) setOnboardingStep(OnboardingStep.Login);
        }, 0);
      }
    };

    void checkOnboarding();
  }, [status, handlePushNotification]);

  // Handle Push Notification Step Transitions
  const handlePushNotificationWithNextStep = useCallback(async () => {
    // Check if we need to show Offline Content step
    const { userPreferencesCollection } = await import('@/lib/tanstack-db');
    const offlineHandled = userPreferencesCollection.get('offline-content-handled');

    if (offlineHandled) {
      setOnboardingStep(OnboardingStep.Loading);
    } else {
      setOnboardingStep(OnboardingStep.OfflineContent);
    }
  }, []);

  const handlePushNotificationNext = useCallback(() => {
    Cookies.remove(Cookie.HAS_LOGGED_IN);
    void handlePushNotificationWithNextStep();
  }, [handlePushNotificationWithNextStep]);

  // Redirect to dashboard when finished
  useEffect(() => {
    if (onboardingStep === OnboardingStep.Loading) {
      const shareText = searchParameters.get('text');
      const shareTitle = searchParameters.get('title');
      const shareUrl = searchParameters.get('url');

      if (shareText || shareTitle || shareUrl) {
        const params = new URLSearchParams();
        if (shareText) params.set('text', shareText);
        if (shareTitle) params.set('title', shareTitle);
        if (shareUrl) params.set('url', shareUrl);
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
    handlePushNotification: handlePushNotificationNext,
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
