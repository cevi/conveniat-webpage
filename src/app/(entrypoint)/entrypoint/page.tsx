'use client';
import React, { useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { PushNotificationManager } from '@/components/push-notification-manager';
import {
  AcceptCookieEntrypointComponent,
  cookieInfoText,
} from '@/content/entrypoint/accept-cookies-component';
import { Cookie } from '@/types';
import { CenteredConveniatLogo } from '@/content/entrypoint/centered-conveniat-logo';

type OnboardingStep = 'initial' | 'login' | 'push-notifications' | 'loading' | undefined;

const handleLogin = (): void => {
  signIn('cevi-db', {
    redirect: false,
  })
    .then(() => {
      console.log('Logged in successfully!');
      Cookies.set(Cookie.HAS_LOGGED_IN, 'true');
    })
    .catch((error: unknown) => {
      console.error('Login error', error);
    });
};

const LoginEntrypointComponent = (properties: { onClick: () => void }) => {
  return (
    <div className="flex flex-col rounded-lg p-8 text-center">
      <CenteredConveniatLogo />

      <p className="mb-4 text-balance text-gray-700">
        Some app functionality require authentication, please log in.
      </p>
      <button
        onClick={handleLogin}
        className="rounded-[8px] bg-red-700 px-8 py-3 text-center font-heading text-lg font-bold leading-normal text-red-100 hover:bg-red-800"
      >
        Login mit Cevi.DB
      </button>

      <button onClick={properties.onClick} className="mt-3 font-semibold text-gray-400">
        überspringen
      </button>
    </div>
  );
};

const PushNotificationManagerEntrypointComponent = (properties: { callback: () => void }) => {
  return (
    <div className="rounded-lg p-8 text-center">
      <CenteredConveniatLogo />

      <PushNotificationManager callback={properties.callback} />

      <button onClick={properties.callback} className="mt-3 font-semibold text-gray-400">
        überspringen
      </button>
    </div>
  );
};

const GettingReadyEntrypointComponent = () => {
  return (
    <div className="rounded-lg p-8 text-center">
      <CenteredConveniatLogo />
      <p className="mb-4 text-balance text-gray-700">Getting the application ready for you.</p>
    </div>
  );
};

const OnboardingPage: React.FC = () => {
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
        <LoginEntrypointComponent onClick={() => setOnboardingStep('push-notifications')} />
      )}

      {onboardingStep === 'push-notifications' && (
        <PushNotificationManagerEntrypointComponent callback={handlePushNotification} />
      )}

      {onboardingStep === 'loading' && <GettingReadyEntrypointComponent />}
    </div>
  );
};

export default OnboardingPage;
