'use client';

import type { cookieInfoText } from '@/features/onboarding/components/accept-cookies-component';
import { AcceptCookieEntrypointComponent } from '@/features/onboarding/components/accept-cookies-component';
import { FancyLoadingScreen } from '@/features/onboarding/components/fancy-loading-screen';
import { LoginScreen } from '@/features/onboarding/components/login-screen';
import { PushNotificationManagerEntrypointComponent } from '@/features/onboarding/components/push-notification-manager';
import { getPushSubscription } from '@/features/onboarding/utils/push-subscription-utils';
import { Cookie } from '@/types/types';
import { DesignCodes } from '@/utils/design-codes';
import Cookies from 'js-cookie';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import type { ChangeEvent } from 'react';
import React, { useEffect, useState } from 'react';

enum OnboardingStep {
  Initial = 0,
  Login = 1,
  PushNotifications = 2,
  Loading = 3,
  Checking = 4,
}

const languageOptions = [
  { value: 'en', label: 'English' },
  { value: 'de', label: 'Deutsch' },
  { value: 'fr', label: 'Français' },
];

const LanguageSwitcher: React.FC<{
  onLanguageChange: (lang: string) => void;
  currentLocale: string;
}> = ({ onLanguageChange, currentLocale }) => {
  return (
    <div className="fixed top-4 right-4 z-50">
      <select
        className="pa-4 rounded-md border border-gray-300 bg-gray-50 shadow-md focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
        value={currentLocale}
        onChange={(event: ChangeEvent<HTMLSelectElement>) => onLanguageChange(event.target.value)}
      >
        {languageOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

const getInitialLocale = (): 'en' | 'de' | 'fr' => {
  if (typeof navigator === 'undefined') return 'de'; // SSR Guard
  const cookieLocale = Cookies.get(Cookie.LOCALE_COOKIE);
  if (cookieLocale !== undefined) {
    return cookieLocale as 'en' | 'de' | 'fr';
  }
  let _locale = navigator.language.split('-')[0] as 'en' | 'de' | 'fr';
  if (!['en', 'de', 'fr'].includes(_locale)) _locale = 'en';
  return _locale;
};

const getInitialOnboardingStep = (): OnboardingStep => {
  return OnboardingStep.Checking;
};

export const OnboardingProcess: React.FC = () => {
  const [locale, setLocale] = useState<keyof typeof cookieInfoText>(getInitialLocale);
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>(getInitialOnboardingStep);
  const { status } = useSession();

  const router = useRouter();

  const [hasManuallyChangedLanguage, setHasManuallyChangedLanguage] = useState(() => {
    if (typeof globalThis === 'undefined') return false;
    return Cookies.get(Cookie.LOCALE_COOKIE) === undefined;
  });

  // Set the cookie only if the user has manually changed the language
  // this prevents that the user needs to select the language again
  useEffect(() => {
    if (hasManuallyChangedLanguage && onboardingStep >= OnboardingStep.Login) {
      Cookies.set(Cookie.LOCALE_COOKIE, locale, { expires: 730 });
    }
  }, [hasManuallyChangedLanguage, locale, onboardingStep]);

  const isMounted = React.useRef(true);

  useEffect(() => {
    return (): void => {
      isMounted.current = false;
    };
  }, []);

  const handlePushNotification = (): void => {
    setOnboardingStep(OnboardingStep.Loading);
    Cookies.set(Cookie.DESIGN_MODE, DesignCodes.APP_DESIGN, { expires: 730 });
    Cookies.remove(Cookie.HAS_LOGGED_IN);
  };

  useEffect(() => {
    // Determine the step client-side to avoid hydration mismatch
    const hasAcceptedCookies = Cookies.get(Cookie.CONVENIAT_COOKIE_BANNER) === 'true';

    if (!hasAcceptedCookies) {
      // Defer state update to next tick to avoid "synchronous setState in effect" error
      // and allow initial render to complete.
      setTimeout(() => {
        if (isMounted.current) setOnboardingStep(OnboardingStep.Initial);
      }, 0);
      return;
    }

    if (status === 'loading') {
      return;
    }

    if (status === 'authenticated') {
      // Check for push subscription before showing the screen
      getPushSubscription()
        .then((subscription: PushSubscription | undefined): void => {
          if (!isMounted.current) return;
          const hasSkipped = Cookies.get(Cookie.SKIP_PUSH_NOTIFICATION) === 'true';

          if (subscription || hasSkipped) {
            // Already subscribed OR explicitly skipped: skip to main app
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
  }, [status]);

  const handleLanguageChange = (newLocale: string): void => {
    setLocale(newLocale as keyof typeof cookieInfoText);
    setHasManuallyChangedLanguage(true);
  };

  const acceptCookiesCallback = (): void => {
    router.prefetch('/app/dashboard');
    if (status === 'authenticated') {
      getPushSubscription()
        .then((subscription: PushSubscription | undefined): void => {
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          if (!isMounted.current) return;
          if (subscription) {
            handlePushNotification();
          } else {
            setOnboardingStep(OnboardingStep.PushNotifications);
          }
        })
        .catch((): void => setOnboardingStep(OnboardingStep.PushNotifications));
    } else {
      setOnboardingStep(OnboardingStep.Login);
    }
  };

  useEffect(() => {
    if (onboardingStep === OnboardingStep.Loading) {
      console.log('Redirect to Homepage');
      router.push('/app/dashboard');
    }
  }, [onboardingStep, router]);

  return (
    <div className="relative mx-auto flex h-screen max-w-96 items-center justify-center">
      <LanguageSwitcher onLanguageChange={handleLanguageChange} currentLocale={locale} />
      {onboardingStep === OnboardingStep.Initial && (
        <AcceptCookieEntrypointComponent locale={locale} callback={acceptCookiesCallback} />
      )}

      {onboardingStep === OnboardingStep.Login && (
        <LoginScreen
          locale={locale}
          onClick={() => setOnboardingStep(OnboardingStep.PushNotifications)}
        />
      )}

      {onboardingStep === OnboardingStep.PushNotifications && (
        <PushNotificationManagerEntrypointComponent
          callback={handlePushNotification}
          locale={locale}
        />
      )}

      {(onboardingStep === OnboardingStep.Loading ||
        onboardingStep === OnboardingStep.Checking) && <FancyLoadingScreen />}
    </div>
  );
};
