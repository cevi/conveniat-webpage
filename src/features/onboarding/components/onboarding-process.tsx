'use client';

import type { cookieInfoText } from '@/features/onboarding/components/accept-cookies-component';
import { AcceptCookieEntrypointComponent } from '@/features/onboarding/components/accept-cookies-component';
import { GettingReadyEntrypointComponent } from '@/features/onboarding/components/getting-started';
import { LoginScreen } from '@/features/onboarding/components/login-screen';
import { PushNotificationManagerEntrypointComponent } from '@/features/onboarding/components/push-notification-manager';
import { Cookie } from '@/types/types';
import { DesignCodes } from '@/utils/design-codes';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';
import type { ChangeEvent } from 'react';
import React, { useEffect, useState } from 'react';

enum OnboardingStep {
  Initial = 0,
  Login = 1,
  PushNotifications = 2,
  Loading = 3,
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
  if (typeof globalThis === 'undefined') return OnboardingStep.Initial; // SSR Guard
  const hasAcceptedCookies = Cookies.get(Cookie.CONVENIAT_COOKIE_BANNER) === 'true';
  const hasLoggedIn = Cookies.get(Cookie.HAS_LOGGED_IN) === 'true';

  if (!hasAcceptedCookies) {
    return OnboardingStep.Initial;
  }
  if (!hasLoggedIn) {
    return OnboardingStep.Login;
  }
  return OnboardingStep.PushNotifications;
};

export const OnboardingProcess: React.FC = () => {
  const [locale, setLocale] = useState<keyof typeof cookieInfoText>(getInitialLocale);
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>(getInitialOnboardingStep);

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

  const handleLanguageChange = (newLocale: string): void => {
    setLocale(newLocale as keyof typeof cookieInfoText);
    setHasManuallyChangedLanguage(true);
  };

  const acceptCookiesCallback = (): void => {
    router.prefetch('/app/dashboard');
    setOnboardingStep(OnboardingStep.Login);
  };

  const handlePushNotification = (): void => {
    setOnboardingStep(OnboardingStep.Loading);
    Cookies.set(Cookie.DESIGN_MODE, DesignCodes.APP_DESIGN, { expires: 730 });
    Cookies.remove(Cookie.HAS_LOGGED_IN);
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

      {onboardingStep === OnboardingStep.Loading && (
        <GettingReadyEntrypointComponent locale={locale} />
      )}
    </div>
  );
};
