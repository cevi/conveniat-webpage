import { Button } from '@/components/ui/buttons/button';
import { IconTile } from '@/components/ui/icon-tile';
import {
  OnboardingNotice,
  OnboardingStepScreen,
} from '@/features/onboarding/components/onboarding-step';
import {
  pushNotificationReason,
  pushNotificationTitle,
} from '@/features/onboarding/onboarding-constants';
import type { StaticTranslationString } from '@/types/types';
import { Bell, Loader2 } from 'lucide-react';
import React from 'react';

const subscribedText: StaticTranslationString = {
  en: 'You are subscribed to push notifications.',
  de: 'Du bist für Push-Benachrichtigungen angemeldet.',
  fr: 'Vous êtes abonné aux notifications push.',
};

const subscribeAcceptedText: StaticTranslationString = {
  en: 'Enable Notifications',
  de: 'Benachrichtigungen aktivieren',
  fr: 'Activer les notifications',
};

const unsubscribeAcceptedText: StaticTranslationString = {
  en: 'Disable Notifications',
  de: 'Benachrichtigungen deaktivieren',
  fr: 'Désactiver les notifications',
};

interface PushNotificationActionsProperties {
  locale: 'de' | 'fr' | 'en';
  isSubscribed: boolean;
  isLoading: boolean;
  errorMessage: string | undefined;

  onToggle: () => Promise<boolean>;
  onContinue: () => void;
}

/** The notification step for Web Push: why it is asked, and the switch to turn it on or off. */
export const PushNotificationActions: React.FC<PushNotificationActionsProperties> = ({
  locale,
  isSubscribed,
  isLoading,
  errorMessage,
  onToggle,
  onContinue,
}) => {
  const hasError = errorMessage !== undefined && errorMessage !== '';
  const hasStatus = isSubscribed || hasError;
  return (
    <OnboardingStepScreen
      visual={<IconTile icon={Bell} size="lg" />}
      title={pushNotificationTitle[locale]}
      description={pushNotificationReason[locale]}
      actions={
        <Button
          variant="primary"
          size="touch"
          onClick={() => {
            void onToggle().then((success) => {
              if (success) onContinue();
            });
          }}
          disabled={isLoading || hasError}
          aria-busy={isLoading}
        >
          {isLoading && <Loader2 className="animate-spin" aria-hidden="true" />}
          {isSubscribed ? unsubscribeAcceptedText[locale] : subscribeAcceptedText[locale]}
        </Button>
      }
    >
      {hasStatus ? (
        <div className="flex flex-col gap-3">
          {isSubscribed && <OnboardingNotice>{subscribedText[locale]}</OnboardingNotice>}
          {hasError && <OnboardingNotice role="alert">{errorMessage}</OnboardingNotice>}
        </div>
      ) : undefined}
    </OnboardingStepScreen>
  );
};
