import type { StaticTranslationString } from '@/types/types';

import React from 'react';

const notYetSubscribed: StaticTranslationString = {
  en: 'You are not subscribed to push notifications.',
  de: 'Du bist nicht für Push-Benachrichtigungen angemeldet.',
  fr: "Vous n'êtes pas abonné aux notifications push.",
};

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

export const PushNotificationActions: React.FC<PushNotificationActionsProperties> = ({
  locale,
  isSubscribed,
  isLoading,
  errorMessage,
  onToggle,
  onContinue,
}) => {
  return (
    <div className="mb-0 flex flex-col items-center">
      <p className="mb-4 text-balance text-gray-700">
        {isSubscribed ? subscribedText[locale] : notYetSubscribed[locale]}
      </p>

      {errorMessage && (
        <p className="mb-4 rounded bg-red-50 p-2 text-sm text-red-600">{errorMessage}</p>
      )}

      <button
        className="font-heading flex cursor-pointer items-center justify-center gap-2 rounded-[8px] bg-red-700 px-8 py-3 text-center text-lg leading-normal font-bold text-red-100 duration-100 hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
        onClick={() => {
          void onToggle().then((success) => {
            if (success) onContinue();
          });
        }}
        disabled={isLoading || !!errorMessage}
      >
        {isLoading && (
          <div className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-white border-t-transparent" />
        )}
        {isSubscribed ? unsubscribeAcceptedText[locale] : subscribeAcceptedText[locale]}
      </button>
    </div>
  );
};
