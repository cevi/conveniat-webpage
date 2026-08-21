'use client';

import { AcceptCookieEntrypointComponent } from '@/features/onboarding/components/accept-cookies-component';
import { FancyLoadingScreen } from '@/features/onboarding/components/fancy-loading-screen';
import { LanguageSwitcher } from '@/features/onboarding/components/language-switcher';
import { LoginScreen, loginDismissText } from '@/features/onboarding/components/login-screen';
import { NoInternetComponent } from '@/features/onboarding/components/no-internet-component';
import { OfflineContentEntrypointComponent } from '@/features/onboarding/components/offline-content-component';
import { OnboardingLayout } from '@/features/onboarding/components/onboarding-layout';
import { OnboardingProgress } from '@/features/onboarding/components/onboarding-progress';
import {
  PushNotificationManagerEntrypointComponent,
  skipPushNotificationText,
} from '@/features/onboarding/components/push-notification-manager';
import { useOnboarding } from '@/features/onboarding/hooks/use-onboarding';
import { OnboardingStep } from '@/features/onboarding/types';

import { Cookie } from '@/types/types';
import { motion } from 'framer-motion';
import Cookies from 'js-cookie';
import React from 'react';

export const OnboardingProcessContent: React.FC = () => {
  const {
    locale,
    onboardingStep,
    handleLanguageChange,
    acceptCookiesCallback,
    handlePushNotification,
    handleOfflineContent,
    setOnboardingStep,
    handleSkipLogin,
  } = useOnboarding();

  // Define footer content based on step
  let footer: React.ReactNode = <div className="invisible h-6">Spacer</div>; // Default spacer

  if (onboardingStep === OnboardingStep.Login) {
    footer = (
      <button
        onClick={handleSkipLogin}
        className="cursor-pointer font-semibold text-gray-400 hover:text-gray-600"
      >
        {loginDismissText[locale]}
      </button>
    );
  } else if (onboardingStep === OnboardingStep.PushNotifications) {
    footer = (
      <button
        onClick={() => {
          Cookies.set(Cookie.SKIP_PUSH_NOTIFICATION, 'true', { expires: 7 });
          handlePushNotification();
        }}
        className="cursor-pointer font-semibold text-gray-400 hover:text-gray-600"
      >
        {skipPushNotificationText[locale]}
      </button>
    );
  }

  // Loading & Checking fall through to the default and keep the loading screen.
  let screen: React.ReactNode = <FancyLoadingScreen locale={locale} />;

  switch (onboardingStep) {
    case OnboardingStep.Initial: {
      screen = <AcceptCookieEntrypointComponent locale={locale} callback={acceptCookiesCallback} />;
      break;
    }
    case OnboardingStep.Login: {
      screen = <LoginScreen locale={locale} />;
      break;
    }
    case OnboardingStep.PushNotifications: {
      screen = (
        <PushNotificationManagerEntrypointComponent
          callback={handlePushNotification}
          locale={locale}
        />
      );
      break;
    }
    case OnboardingStep.OfflineContent: {
      screen = (
        <OfflineContentEntrypointComponent callback={handleOfflineContent} locale={locale} />
      );
      break;
    }
    case OnboardingStep.NoInternet: {
      screen = <NoInternetComponent locale={locale} />;
      break;
    }
    default: {
      break;
    }
  }

  return (
    <div className="relative mx-auto flex h-svh max-w-96 flex-col items-center justify-center p-4">
      <LanguageSwitcher onLanguageChange={handleLanguageChange} currentLocale={locale} />

      <div className="flex w-full flex-grow items-center justify-center">
        <OnboardingLayout footer={footer}>
          {/*
            The onboarding screens are deliberately NOT wrapped in `AnimatePresence`, and their
            enter animation deliberately never starts from `opacity: 0`.

            `AnimatePresence mode="wait"` keeps the incoming child unmounted until the outgoing
            child's exit animation reports completion. Every cold start swaps the key immediately
            (the FSM starts at `Checking` and the first effect flush moves it to `Initial`), so
            that handover runs on the very first frames after hydration - exactly when iOS is most
            likely to have the WKWebView hidden or throttled. WebKit suspends animation timelines
            in that state and does not reliably fire their completion event on resume, so the
            handover never finishes and the card stays permanently empty: no cookie banner, no
            button, nothing for the user to press. Rendering the current step directly means a
            stalled animation can no longer gate what is on screen.

            For the same reason `initial` only offsets the screen instead of hiding it. If the
            animation driver never ticks, the content sits 20px off - visible and interactive -
            rather than stuck at zero opacity.
          */}
          <motion.div
            key={onboardingStep}
            initial={{ x: 20 }}
            animate={{ x: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full"
          >
            {screen}
          </motion.div>
        </OnboardingLayout>
      </div>

      <OnboardingProgress currentStep={onboardingStep} onStepClick={setOnboardingStep} />
    </div>
  );
};

export const OnboardingProcess: React.FC = () => {
  return <OnboardingProcessContent />;
};
