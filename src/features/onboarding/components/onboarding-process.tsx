'use client';

import { AcceptCookieEntrypointComponent } from '@/features/onboarding/components/accept-cookies-component';
import { FancyLoadingScreen } from '@/features/onboarding/components/fancy-loading-screen';
import { LanguageSwitcher } from '@/features/onboarding/components/language-switcher';
import { LoginScreen } from '@/features/onboarding/components/login-screen';
import { PushNotificationManagerEntrypointComponent } from '@/features/onboarding/components/push-notification-manager';
import { useOnboarding } from '@/features/onboarding/hooks/use-onboarding';
import { OnboardingStep } from '@/features/onboarding/types';
import React from 'react';

export const OnboardingProcess: React.FC = () => {
  const {
    locale,
    onboardingStep,
    handleLanguageChange,
    acceptCookiesCallback,
    handlePushNotification,
    setOnboardingStep,
  } = useOnboarding();

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
