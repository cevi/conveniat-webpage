'use client';

import { AcceptCookieEntrypointComponent } from '@/features/onboarding/components/accept-cookies-component';
import { FancyLoadingScreen } from '@/features/onboarding/components/fancy-loading-screen';
import { LanguageSwitcher } from '@/features/onboarding/components/language-switcher';
import { LoginScreen, loginDismissText } from '@/features/onboarding/components/login-screen';
import { OfflineContentEntrypointComponent } from '@/features/onboarding/components/offline-content-component';
import { OnboardingLayout } from '@/features/onboarding/components/onboarding-layout';
import { OnboardingProgress } from '@/features/onboarding/components/onboarding-progress';
import {
  PushNotificationManagerEntrypointComponent,
  skipPushNotificationText,
} from '@/features/onboarding/components/push-notification-manager';
import { useOnboarding } from '@/features/onboarding/hooks/use-onboarding';
import { OnboardingStep } from '@/features/onboarding/types';
import { TRPCProvider } from '@/trpc/client';
import { Cookie } from '@/types/types';
import { handleSkipLogin } from '@/utils/login-handler';
import { AnimatePresence, motion } from 'framer-motion';
import Cookies from 'js-cookie';
import React from 'react';

export const OnboardingProcess: React.FC = () => {
  const {
    locale,
    onboardingStep,
    handleLanguageChange,
    acceptCookiesCallback,
    handlePushNotification,
    handleOfflineContent,
    setOnboardingStep,
  } = useOnboarding();

  // Define footer content based on step
  let footer: React.ReactNode = <div className="invisible h-6">Spacer</div>; // Default spacer

  if (onboardingStep === OnboardingStep.Login) {
    footer = (
      <button
        onClick={() => {
          handleSkipLogin();
          setOnboardingStep(OnboardingStep.PushNotifications);
        }}
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

  return (
    <div className="relative mx-auto flex h-svh max-w-96 flex-col items-center justify-center p-4">
      <LanguageSwitcher onLanguageChange={handleLanguageChange} currentLocale={locale} />

      <div className="flex w-full flex-grow items-center justify-center">
        <OnboardingLayout footer={footer}>
          <AnimatePresence mode="wait">
            {onboardingStep === OnboardingStep.Initial && (
              <motion.div
                key="initial"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="w-full"
              >
                <AcceptCookieEntrypointComponent locale={locale} callback={acceptCookiesCallback} />
              </motion.div>
            )}

            {onboardingStep === OnboardingStep.Login && (
              <motion.div
                key="login"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="w-full"
              >
                <LoginScreen locale={locale} />
              </motion.div>
            )}

            {onboardingStep === OnboardingStep.PushNotifications && (
              <motion.div
                key="push"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="w-full"
              >
                <PushNotificationManagerEntrypointComponent
                  callback={handlePushNotification}
                  locale={locale}
                />
              </motion.div>
            )}

            {onboardingStep === OnboardingStep.OfflineContent && (
              <motion.div
                key="offline"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="w-full"
              >
                <TRPCProvider>
                  <OfflineContentEntrypointComponent
                    callback={handleOfflineContent}
                    locale={locale}
                  />
                </TRPCProvider>
              </motion.div>
            )}

            {(onboardingStep === OnboardingStep.Loading ||
              onboardingStep === OnboardingStep.Checking) && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="w-full"
              >
                <FancyLoadingScreen locale={locale} />
              </motion.div>
            )}
          </AnimatePresence>
        </OnboardingLayout>
      </div>

      <OnboardingProgress currentStep={onboardingStep} onStepClick={setOnboardingStep} />
    </div>
  );
};
