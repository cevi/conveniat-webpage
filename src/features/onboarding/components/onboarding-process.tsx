'use client';

import type { cookieInfoText } from '@/features/onboarding/components/accept-cookies-component';
import { AcceptCookieEntrypointComponent } from '@/features/onboarding/components/accept-cookies-component';
import { GettingReadyEntrypointComponent } from '@/features/onboarding/components/getting-started';
import { LoginScreen } from '@/features/onboarding/components/login-screen';
import { PushNotificationManagerEntrypointComponent } from '@/features/onboarding/components/push-notification-manager';
import { Cookie } from '@/types/types';
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

export const OnboardingProcess: React.FC = () => {
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep | undefined>();
  const [locale, setLocale] = useState<keyof typeof cookieInfoText>(
    (Cookies.get('NEXT_LOCALE') ?? 'en') as 'en' | 'de' | 'fr',
  );
  const router = useRouter();

  const [hasManuallyChangedLanguage, setHasManuallyChangedLanguage] = useState(false);

  useEffect(() => {
    // check if NEXT_LOCALE is set in the cookie
    const cookieLocale = Cookies.get('NEXT_LOCALE');
    if (cookieLocale !== undefined) {
      setLocale(cookieLocale as keyof typeof cookieInfoText);
      return;
    }

    // else use the default locale of the OS / browser
    let _locale = navigator.language.split('-')[0] as keyof typeof cookieInfoText;
    if (!(_locale in ['en', 'de', 'fr'])) _locale = 'en'; // fallback to english if locale is not supported
    setLocale(_locale);
    setHasManuallyChangedLanguage(true);
  }, []);

  // Set the cookie only if the user has manually changed the language
  // this prevents that the user needs to select the language again
  useEffect(() => {
    if (
      hasManuallyChangedLanguage &&
      (onboardingStep ?? OnboardingStep.Initial) >= OnboardingStep.Login
    ) {
      Cookies.set('NEXT_LOCALE', locale, { expires: 730 });
    }
  }, [hasManuallyChangedLanguage, locale, onboardingStep]);

  const handleLanguageChange = (newLocale: string): void => {
    setLocale(newLocale as keyof typeof cookieInfoText);
    setHasManuallyChangedLanguage(true);
  };

  const acceptCookiesCallback = (): void => {
    router.prefetch('/');
    setOnboardingStep(OnboardingStep.Login);
  };

  const handlePushNotification = (): void => {
    setOnboardingStep(OnboardingStep.Loading);
    Cookies.set(Cookie.APP_DESIGN, 'true', { expires: 730 });
    Cookies.remove(Cookie.HAS_LOGGED_IN);
  };

  useEffect(() => {
    let navigationTimer: NodeJS.Timeout;

    if (onboardingStep === OnboardingStep.Loading) {
      console.log('Redirect to Homepage');
      router.push('/');
    } else if (
      onboardingStep === OnboardingStep.Login &&
      Cookies.get(Cookie.HAS_LOGGED_IN) === 'true'
    ) {
      setOnboardingStep(OnboardingStep.PushNotifications);
    } else if (
      onboardingStep === OnboardingStep.Initial &&
      Cookies.get(Cookie.CONVENIAT_COOKIE_BANNER) === 'true'
    ) {
      setOnboardingStep(OnboardingStep.Login);
    }

    if (onboardingStep === undefined) setOnboardingStep(OnboardingStep.Initial);

    return (): void => clearTimeout(navigationTimer);
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
