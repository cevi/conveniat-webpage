'use client';
import React, { useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { PushNotificationManager } from '@/components/push-notification-manager';

type OnboardingStep = 'initial' | 'login' | 'push-notifications' | 'loading' | undefined;

const handleLogin = (): void => {
  signIn('cevi-db', {
    redirect: false,
  })
    .then(() => {
      console.log('Logged in successfully!');
      Cookies.set('has-logged-in', 'true');
    })
    .catch((error: unknown) => {
      console.error('Login error', error);
    });
};

const OnboardingPage: React.FC = () => {
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>();
  const router = useRouter();

  const handleAcceptCookies = (): void => {
    Cookies.set('conveniat-cookie-banner', 'true', { expires: 730 });

    // we prefetch the home page after the cookies
    // are accepted and correctly set
    router.prefetch('/');
    setOnboardingStep('login');
  };

  const handlePushNotification = (): void => {
    setOnboardingStep('loading');
    Cookies.set('app-design', 'true', { expires: 730 });
    Cookies.remove('has-logged-in');
  };

  useEffect(() => {
    let navigationTimer: NodeJS.Timeout;

    if (onboardingStep === 'loading') {
      console.log('Redirect to Homepage');
      router.push('/');
    } else if (onboardingStep === 'login' && Cookies.get('has-logged-in') === 'true') {
      setOnboardingStep('push-notifications');
    } else if (onboardingStep === 'initial' && Cookies.get('conveniat-cookie-banner') === 'true') {
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
        <div className="rounded-lg p-8 text-center">
          <h1 className="mb-4 text-2xl font-semibold">Welcome!</h1>
          <p className="mb-4 text-balance text-gray-700">
            We use cookies to ensure you get the best experience on our website.
          </p>
          <button
            onClick={handleAcceptCookies}
            className="rounded-[8px] bg-red-700 px-8 py-3 text-center font-heading text-lg font-bold leading-normal text-red-100 hover:bg-red-800"
          >
            Accept Cookies
          </button>
        </div>
      )}

      {onboardingStep === 'login' && (
        <div className="rounded-lg p-8 text-center">
          <h1 className="mb-4 text-2xl font-semibold">Login</h1>
          <p className="mb-4 text-balance text-gray-700">
            Some app functionality require authentication, please log in.
          </p>
          <button
            onClick={handleLogin}
            className="rounded-[8px] bg-red-700 px-8 py-3 text-center font-heading text-lg font-bold leading-normal text-red-100 hover:bg-red-800"
          >
            Login mit Cevi.DB
          </button>
        </div>
      )}

      {onboardingStep === 'push-notifications' && (
        <div className="rounded-lg p-8 text-center">
          <PushNotificationManager />
          <button
            onClick={handlePushNotification}
            className="rounded-[8px] bg-red-700 px-8 py-3 text-center font-heading text-lg font-bold leading-normal text-red-100 hover:bg-red-800"
          >
            Weiter
          </button>
        </div>
      )}

      {onboardingStep === 'loading' && (
        <div className="rounded-lg p-8 text-center">
          <h1 className="mb-4 text-2xl font-semibold">Loading...</h1>
          <p className="mb-4 text-balance text-gray-700">Getting the application ready for you.</p>
          {/* With some nice loading animation, e.g.
          the circle around the conveniat27 app icon fills up */}
          <div className="mx-auto mt-4 h-16 w-16 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div>
        </div>
      )}
    </div>
  );
};

export default OnboardingPage;
