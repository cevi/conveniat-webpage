import { Button } from '@/components/ui/buttons/button';
import { IconTile } from '@/components/ui/icon-tile';
import {
  OnboardingNotice,
  OnboardingStepScreen,
} from '@/features/onboarding/components/onboarding-step';
import {
  offlineContentNotNowButton,
  pushNotificationReason,
  pushNotificationTitle,
} from '@/features/onboarding/onboarding-constants';
import type { StaticTranslationString } from '@/types/types';
import { isPWAStandalone } from '@/utils/standalone-check';
import { BellOff } from 'lucide-react';
import React from 'react';

const notSupportedBrowserText: StaticTranslationString = {
  en: 'Push notifications are not supported in this browser.',
  de: 'Push-Benachrichtigungen werden in diesem Browser nicht unterstützt.',
  fr: 'Les notifications push ne sont pas prises en charge dans ce navigateur.',
};

const notSupportedDeviceText: StaticTranslationString = {
  en: 'Push notifications are not supported on this device.',
  de: 'Push-Benachrichtigungen werden auf diesem Gerät nicht unterstützt.',
  fr: 'Les notifications push ne sont pas prises en charge sur cet appareil.',
};

interface PushNotificationNotSupportedProperties {
  locale: 'de' | 'fr' | 'en';
  onSkip: () => void;
}

/** The notification step where neither the browser nor the device can receive push. */
export const PushNotificationNotSupported: React.FC<PushNotificationNotSupportedProperties> = ({
  locale,
  onSkip,
}) => {
  const isStandalone = isPWAStandalone();

  return (
    <OnboardingStepScreen
      visual={<IconTile icon={BellOff} size="lg" />}
      title={pushNotificationTitle[locale]}
      description={pushNotificationReason[locale]}
      actions={
        <Button variant="quiet" size="touch" onClick={onSkip}>
          {offlineContentNotNowButton[locale]}
        </Button>
      }
    >
      <OnboardingNotice>
        {isStandalone ? notSupportedDeviceText[locale] : notSupportedBrowserText[locale]}
      </OnboardingNotice>
    </OnboardingStepScreen>
  );
};
