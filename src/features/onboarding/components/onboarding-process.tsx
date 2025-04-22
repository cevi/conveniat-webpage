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

export const OnboardingProcess: React.FC = () => {
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>();
  const router = useRouter();

  // at this point we do not yet use the locale of the user
  // thus we use the default locale of the OS / browser
  let locale = navigator.language.split('-')[0] as keyof typeof cookieInfoText;
  if (!(locale in ['en', 'de', 'fr'])) locale = 'en'; // fallback to english if locale is not supported

  const acceptCookiesCallback = (): void => {
    // we prefetch the home page after the cookies
    // are accepted and correctly set
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

    // initialize
    if (onboardingStep === undefined) setOnboardingStep('initial');

    // Cleanup function: clear the timer if the component unmounts
    // or if the onboardingStep changes before the timer finishes.
    return (): void => clearTimeout(navigationTimer);
  }, [onboardingStep, router]);

  return (
    <div className="flex h-screen items-center justify-center">
      {onboardingStep === 'initial' && (
        <AcceptCookieEntrypointComponent locale={locale} callback={acceptCookiesCallback} />
      )}

      {onboardingStep === 'login' && (
        <LoginScreen onClick={() => setOnboardingStep('push-notifications')} />
      )}

      {onboardingStep === 'push-notifications' && (
        <PushNotificationManagerEntrypointComponent
          callback={handlePushNotification}
          locale={locale}
        />
      )}

      {onboardingStep === 'loading' && <GettingReadyEntrypointComponent />}
    </div>
  );
};
