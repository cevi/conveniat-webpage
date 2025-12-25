'use client';

import type { cookieInfoText } from '@/features/onboarding/onboarding-constants';
import { OnboardingStep } from '@/features/onboarding/types';
import { getPushSubscription } from '@/features/onboarding/utils/push-subscription-utils';
import { Cookie } from '@/types/types';
import { DesignCodes, DesignModeTriggers } from '@/utils/design-codes';
import Cookies from 'js-cookie';
import { useSession } from 'next-auth/react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

const getInitialLocale = (): 'en' | 'de' | 'fr' => {
  // Always return 'de' initially to match the server-side default and avoid hydration mismatch.
  // The useEffect hook will update the locale to the user's preference (cookie/browser) immediately after mount.
  return 'de';
};

const getInitialOnboardingStep = (): OnboardingStep => {
  return OnboardingStep.Checking;
};

interface UseOnboardingReturn {
  locale: keyof typeof cookieInfoText;
  onboardingStep: OnboardingStep;
  handleLanguageChange: (newLocale: string) => void;
  acceptCookiesCallback: () => void;
  handlePushNotification: () => void;
  setOnboardingStep: React.Dispatch<React.SetStateAction<OnboardingStep>>;
}

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
    router.prefetch('/app/dashboard');
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
  }, [status, router, handlePushNotification]);

  // Set the design-mode cookie if force-app-mode is present
  useEffect(() => {
    const forceAppMode = searchParameters.get(DesignModeTriggers.QUERY_PARAM_FORCE) === 'true';
    if (forceAppMode) {
      Cookies.set(Cookie.DESIGN_MODE, DesignCodes.APP_DESIGN, { expires: 730 });
      console.log('[Onboarding] Force Mode: Setting Cookie Client-side', {
        cookieName: Cookie.DESIGN_MODE,
        cookieValue: DesignCodes.APP_DESIGN,
      });

      const params = new URLSearchParams(searchParameters.toString());
      params.delete(DesignModeTriggers.QUERY_PARAM_FORCE);
      const queryString = params.toString();
      const newUrl = `${pathname}${queryString ? `?${queryString}` : ''}`;
      router.replace(newUrl);
    }
  }, [searchParameters, pathname, router]);

  // Sync locale state with cookie on mount to fix inconsistent selector or hydration mismatch
  useEffect(() => {
    // Force client-side read to ensure state matches browser reality
    const cookieLocale = Cookies.get(Cookie.LOCALE_COOKIE);
    let targetLocale: 'en' | 'de' | 'fr' = 'en';

    if (cookieLocale && ['en', 'de', 'fr'].includes(cookieLocale)) {
      targetLocale = cookieLocale as 'en' | 'de' | 'fr';
    } else if (typeof navigator !== 'undefined') {
      const browserLang = navigator.language.split('-')[0];
      if (browserLang === 'en' || browserLang === 'de' || browserLang === 'fr') {
        targetLocale = browserLang;
      }
    }

    // Only update if different to prevent unnecessary renders, but vital for hydration fix
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

  // Determine the current step
  useEffect(() => {
    const hasAcceptedCookies = Cookies.get(Cookie.CONVENIAT_COOKIE_BANNER) === 'true';

    if (!hasAcceptedCookies) {
      setTimeout(() => {
        if (isMounted.current) setOnboardingStep(OnboardingStep.Initial);
      }, 0);
      return;
    }

    if (status === 'loading') return;

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
          if (isMounted.current) setOnboardingStep(OnboardingStep.PushNotifications);
        });
    } else {
      setTimeout(() => {
        if (isMounted.current) setOnboardingStep(OnboardingStep.Login);
      }, 0);
    }
  }, [status, handlePushNotification]);

  // Redirect to dashboard when finished
  useEffect(() => {
    if (onboardingStep === OnboardingStep.Loading) {
      console.log('Redirect to Homepage');
      router.push('/app/dashboard');
    }
  }, [onboardingStep, router]);

  return {
    locale,
    onboardingStep,
    handleLanguageChange,
    acceptCookiesCallback,
    handlePushNotification,
    setOnboardingStep,
  };
};
