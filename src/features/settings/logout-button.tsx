'use client';
import { Button } from '@/components/ui/buttons/button';
import { useCurrentLocale } from '@/hooks/use-current-locale';
import { signOutNeedsConnectionText, useSignOut } from '@/hooks/use-sign-out';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { assignLocation } from '@/utils/assign-location';
import { Loader2 } from 'lucide-react';
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
  const [failed, setFailed] = useState(false);
  const signOut = useSignOut();

  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="outlined"
        size="touch"
        className="w-full"
        onClick={() => {
          setIsLoading(true);
          setFailed(false);
          void signOut()
            .then(() => assignLocation('/'))
            .catch((error: unknown) => {
              console.warn('Logging out failed', error);
              setFailed(true);
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
      {failed && (
        <p role="alert" className="text-danger-text text-[13px] leading-[18px] font-medium">
          {signOutNeedsConnectionText[locale]}
        </p>
      )}
    </div>
  );
};
