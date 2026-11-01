import { Button } from '@/components/ui/buttons/button';
import { offlineContentNotNowButton } from '@/features/onboarding/onboarding-constants';
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

export const PushNotificationNotSupported: React.FC<PushNotificationNotSupportedProperties> = ({
  locale,
  onSkip,
}) => {
  const isStandalone = isPWAStandalone();

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-quiet flex items-start gap-2.5 rounded-xl p-3 text-left text-[15px] leading-normal text-green-700">
        <BellOff className="text-conveniat-green mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <span>
          {isStandalone ? notSupportedDeviceText[locale] : notSupportedBrowserText[locale]}
        </span>
      </div>
      <Button variant="primary" size="touch" className="w-full" onClick={onSkip}>
        {offlineContentNotNowButton[locale]}
      </Button>
    </div>
  );
};
