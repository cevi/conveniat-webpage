'use client';

import { isAppOffered } from '@/components/get-the-app';
import { SetHeaderActions } from '@/components/header/header-actions';
import { buttonVariants } from '@/components/ui/buttons/button';
import { environmentVariables } from '@/config/environment-variables';
import { SignInToWristbands } from '@/features/wristbands/components/sign-in-to-wristbands';
import { tagText } from '@/features/wristbands/tag-texts';
import { useCurrentLocale } from '@/hooks/use-current-locale';
import type { Locale } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { ExternalLink } from 'lucide-react';
import type React from 'react';

const StoreLink: React.FC<{ href: string; label: string }> = ({ href, label }) => (
  <a
    href={href}
    target="_blank"
    rel="noreferrer"
    className={cn(buttonVariants({ variant: 'outlined', size: 'touch' }), 'w-full')}
  >
    <ExternalLink aria-hidden />
    {label}
  </a>
);

/**
 * A band tapped by someone who is not signed in. Bands are read only by people who are, so the
 * page says nothing about it and offers the login, which comes back to the same band. On the
 * website also the way to the app, where the deployment offers one; inside the app and the
 * installed PWA that would be nonsense.
 */
export const GuestTagView: React.FC<{
  /** rendered in the app's design, which the proxy picks for the native app and the PWA */
  inAppDesign: boolean;
  /** this page, where the login returns to */
  callbackUrl: string;
}> = ({ inAppDesign, callbackUrl }) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const offerStores = !inAppDesign && isAppOffered;
  const appStore = offerStores ? environmentVariables.NEXT_PUBLIC_APP_STORE_URL : undefined;
  const playStore = offerStores ? environmentVariables.NEXT_PUBLIC_PLAY_STORE_URL : undefined;

  return (
    <>
      <SetHeaderActions />
      <SignInToWristbands callbackUrl={callbackUrl}>
        {appStore !== undefined && (
          <StoreLink href={appStore} label={tagText('appStore', locale)} />
        )}
        {playStore !== undefined && (
          <StoreLink href={playStore} label={tagText('playStore', locale)} />
        )}
      </SignInToWristbands>
    </>
  );
};
