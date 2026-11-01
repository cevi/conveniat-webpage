import { Button } from '@/components/ui/buttons/button';
import type { StaticTranslationString } from '@/types/types';
import { CircleAlert } from 'lucide-react';
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
      <p className="mb-4 text-[15px] leading-normal text-balance text-green-700">
        {isSubscribed ? subscribedText[locale] : notYetSubscribed[locale]}
      </p>

      {errorMessage && (
        <p className="bg-danger-soft text-danger-text mb-4 flex items-start gap-2.5 rounded-xl p-3 text-left text-[15px] leading-normal">
          <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          {errorMessage}
        </p>
      )}

      <Button
        variant="primary"
        size="touch"
        className="w-full"
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
      </Button>
    </div>
  );
};
