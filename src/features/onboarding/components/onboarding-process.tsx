'use client';

import type { cookieInfoText } from '@/features/onboarding/components/accept-cookies-component';
import { AcceptCookieEntrypointComponent } from '@/features/onboarding/components/accept-cookies-component';
import { GettingReadyEntrypointComponent } from '@/features/onboarding/components/getting-started';
import { LoginScreen } from '@/features/onboarding/components/login-screen';
import { PushNotificationManagerEntrypointComponent } from '@/features/onboarding/components/push-notification-manager';
import { Cookie } from '@/types/types';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';

type OnboardingStep = 'initial' | 'login' | 'push-notifications' | 'loading' | undefined;

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
        className="bg-gray-50 border border-gray-300 pa-4 rounded-md shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
        value={currentLocale}
        onChange={(e) => onLanguageChange(e.target.value)}
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
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>();
  const [locale, setLocale] = useState<keyof typeof cookieInfoText>('en');
  const router = useRouter();

  useEffect(() => {
    // at this point we do not yet use the locale of the user
    // thus we use the default locale of the OS / browser
    let locale = navigator.language.split('-')[0] as keyof typeof cookieInfoText;
    if (!(locale in ['en', 'de', 'fr'])) locale = 'en'; // fallback to english if locale is not supported
  }, []);

  const handleLanguageChange = (newLocale: string): void => {
    setLocale(newLocale as keyof typeof cookieInfoText);
  };

  const acceptCookiesCallback = (): void => {
    router.prefetch('/');
    setOnboardingStep('login');
  };

  const handlePushNotification = (): void => {
    setOnboardingStep('loading');
    Cookies.set(Cookie.APP_DESIGN, 'true', { expires: 730 });
    Cookies.remove(Cookie.HAS_LOGGED_IN);
  };

  useEffect(() => {
    let navigationTimer: NodeJS.Timeout;

    if (onboardingStep === 'loading') {
      console.log('Redirect to Homepage');
      router.push('/');
    } else if (onboardingStep === 'login' && Cookies.get(Cookie.HAS_LOGGED_IN) === 'true') {
      setOnboardingStep('push-notifications');
    } else if (
      onboardingStep === 'initial' &&
      Cookies.get(Cookie.CONVENIAT_COOKIE_BANNER) === 'true'
    ) {
      setOnboardingStep('login');
    }

    if (onboardingStep === undefined) setOnboardingStep('initial');

    return (): void => clearTimeout(navigationTimer);
  }, [onboardingStep, router]);

  return (
    <div className="relative flex h-screen items-center justify-center max-w-96 mx-auto">
      <LanguageSwitcher onLanguageChange={handleLanguageChange} currentLocale={locale} />
      {onboardingStep === 'initial' && (
        <AcceptCookieEntrypointComponent locale={locale} callback={acceptCookiesCallback} />
      )}

      {onboardingStep === 'login' && (
        <LoginScreen locale={locale} onClick={() => setOnboardingStep('push-notifications')} />
      )}

      {onboardingStep === 'push-notifications' && (
        <PushNotificationManagerEntrypointComponent
          callback={handlePushNotification}
          locale={locale}
        />
      )}

      {onboardingStep === 'loading' && <GettingReadyEntrypointComponent locale={locale} />}
    </div>
  );
};
