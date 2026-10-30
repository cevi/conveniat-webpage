'use client';
import { Button } from '@/components/ui/buttons/button';
import { useCurrentLocale } from '@/hooks/use-current-locale';
import { useReleasePushSubscriptions } from '@/hooks/use-release-push-subscriptions';
import { flushPersonalData } from '@/lib/flush-personal-data';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { Loader2 } from 'lucide-react';
import { signOut } from 'next-auth/react';
import React, { useState } from 'react';

const logoutText: StaticTranslationString = {
  de: 'Abmelden',
  en: 'Log out',
  fr: 'Déconnexion',
};

const loggingOutText: StaticTranslationString = {
  de: 'Abmelden...',
  en: 'Logging out...',
  fr: 'Déconnexion...',
};

export const LogoutButton: React.FC = () => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const [isLoading, setIsLoading] = useState(false);
  const releasePushSubscriptions = useReleasePushSubscriptions();

  return (
    <Button
      variant="outlined"
      size="touch"
      className="w-full"
      onClick={() => {
        setIsLoading(true);
        void releasePushSubscriptions()
          .then(() => {
            flushPersonalData({ clearCachedPages: true });
            return signOut({
              redirect: true,
              redirectTo: '/',
            });
          })
          .catch((error: unknown) => {
            console.error(error);
            setIsLoading(false);
          });
      }}
      disabled={isLoading}
    >
      {isLoading ? (
        <>
          <Loader2 className="animate-spin" aria-hidden="true" />
          {loggingOutText[locale]}
        </>
      ) : (
        logoutText[locale]
      )}
    </Button>
  );
};
