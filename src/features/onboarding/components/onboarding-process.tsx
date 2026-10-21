'use client';

import { Button } from '@/components/ui/buttons/button';
import { AcceptCookieEntrypointComponent } from '@/features/onboarding/components/accept-cookies-component';
import { FancyLoadingScreen } from '@/features/onboarding/components/fancy-loading-screen';
import { LanguageSwitcher } from '@/features/onboarding/components/language-switcher';
import { LoginScreen, loginDismissText } from '@/features/onboarding/components/login-screen';
import { NoInternetComponent } from '@/features/onboarding/components/no-internet-component';
import { OfflineContentEntrypointComponent } from '@/features/onboarding/components/offline-content-component';
import { OnboardingFrame } from '@/features/onboarding/components/onboarding-frame';
import { OnboardingProgress } from '@/features/onboarding/components/onboarding-progress';
import {
  PushNotificationManagerEntrypointComponent,
  skipPushNotificationText,
} from '@/features/onboarding/components/push-notification-manager';
import { useOnboarding } from '@/features/onboarding/hooks/use-onboarding';
import { useOnboardingBack } from '@/features/onboarding/hooks/use-onboarding-back';
import { OnboardingStep } from '@/features/onboarding/types';

import type { StaticTranslationString } from '@/types/types';
import { Cookie } from '@/types/types';
import { motion } from 'framer-motion';
import Cookies from 'js-cookie';
import { ChevronLeft } from 'lucide-react';
import React from 'react';

const backText: StaticTranslationString = {
  de: 'Zurück',
  en: 'Back',
  fr: 'Retour',
};

/**
 * The installed app's first screens: privacy, Cevi.DB login, notifications and the offline
 * download, one per screen, in the order the onboarding state machine asks them.
 */
export const OnboardingProcessContent: React.FC = () => {
  const {
    locale,
    onboardingStep,
    handleLanguageChange,
    answerCookiesCallback,
    handlePushNotification,
    handleOfflineContent,
    handleSkipLogin,
  } = useOnboarding();
  const { shownStep, canGoBack, goBack, returnToCurrent } = useOnboardingBack(onboardingStep);

  // Every answer, also one given on a step the user went back to, hands over to the flow again.
  const answerCookies = (): void => {
    returnToCurrent();
    answerCookiesCallback();
  };
  const answerPush = (): void => {
    returnToCurrent();
    handlePushNotification();
  };
  const answerOffline = (accepted: boolean): void => {
    returnToCurrent();
    handleOfflineContent(accepted);
  };

  // The way past a step without answering it, below the step's own action.
  let footer: React.ReactNode;

  if (shownStep === OnboardingStep.Login) {
    footer = (
      <Button
        variant="quiet"
        size="touch"
        onClick={() => {
          returnToCurrent();
          handleSkipLogin();
        }}
      >
        {loginDismissText[locale]}
      </Button>
    );
  } else if (shownStep === OnboardingStep.PushNotifications) {
    footer = (
      <Button
        variant="quiet"
        size="touch"
        onClick={() => {
          Cookies.set(Cookie.SKIP_PUSH_NOTIFICATION, 'true', { expires: 7 });
          answerPush();
        }}
      >
        {skipPushNotificationText[locale]}
      </Button>
    );
  }

  // Loading & Checking fall through to the default and keep the loading screen.
  let screen: React.ReactNode = <FancyLoadingScreen locale={locale} />;

  switch (shownStep) {
    case OnboardingStep.Initial: {
      screen = <AcceptCookieEntrypointComponent locale={locale} callback={answerCookies} />;
      break;
    }
    case OnboardingStep.Login: {
      screen = <LoginScreen locale={locale} />;
      break;
    }
    case OnboardingStep.PushNotifications: {
      screen = <PushNotificationManagerEntrypointComponent callback={answerPush} locale={locale} />;
      break;
    }
    case OnboardingStep.OfflineContent: {
      screen = <OfflineContentEntrypointComponent callback={answerOffline} locale={locale} />;
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
    <OnboardingFrame
      header={
        <>
          {canGoBack ? (
            <Button variant="quiet" size="touchIcon" onClick={goBack} aria-label={backText[locale]}>
              <ChevronLeft aria-hidden="true" />
            </Button>
          ) : (
            <span className="w-11 shrink-0" />
          )}
          <OnboardingProgress currentStep={shownStep} locale={locale} />
          <LanguageSwitcher onLanguageChange={handleLanguageChange} currentLocale={locale} />
        </>
      }
    >
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
        key={shownStep}
        initial={{ x: 20 }}
        animate={{ x: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="flex min-h-0 w-full flex-1 flex-col"
      >
        {screen}
      </motion.div>
      {footer !== undefined && <div className="flex flex-col pt-3">{footer}</div>}
    </OnboardingFrame>
  );
};

export const OnboardingProcess: React.FC = () => {
  return <OnboardingProcessContent />;
};
