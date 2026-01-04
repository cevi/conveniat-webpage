import { offlineContentNotNowButton } from '@/features/onboarding/onboarding-constants';
import type { StaticTranslationString } from '@/types/types';
import { isPWAStandalone } from '@/utils/standalone-check';
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
      <div className="flex items-center justify-center gap-2 rounded-lg bg-gray-100 p-3 text-gray-600">
        <span className="font-semibold text-balance">
          {isStandalone ? notSupportedDeviceText[locale] : notSupportedBrowserText[locale]}
        </span>
      </div>
      <button
        onClick={onSkip}
        className="font-heading w-full transform cursor-pointer rounded-[8px] bg-gray-400 px-8 py-3 text-center text-lg leading-normal font-bold text-white shadow-md duration-100 hover:scale-[1.02] hover:bg-gray-500 active:scale-[0.98]"
      >
        {offlineContentNotNowButton[locale]}
      </button>
    </div>
  );
};
