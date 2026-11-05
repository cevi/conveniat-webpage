'use client';

import { Button } from '@/components/ui/buttons/button';
import { EmptyState } from '@/components/ui/empty-state';
import { readerText } from '@/features/wristbands/reader-texts';
import { useCurrentLocale } from '@/hooks/use-current-locale';
import type { Locale } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { LogIn } from 'lucide-react';
import { signIn } from 'next-auth/react';
import type React from 'react';

/**
 * What the wristband pages show someone who is not signed in: bands are programmed and read
 * only by people who are, so nothing but the login, which returns to the same page. In the
 * native app the login runs in the system browser, and the app loads the callback in its place.
 */
export const SignInToWristbands: React.FC<{
  /** where the login returns to; the open page if not given */
  callbackUrl?: string;
  /** below the login, like the ways to the app on the website */
  children?: React.ReactNode;
}> = ({ callbackUrl, children }) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  return (
    <EmptyState
      icon={LogIn}
      title={readerText('signInTitle', locale)}
      action={
        <div className="flex w-full max-w-xs flex-col gap-2">
          <Button
            variant="primary"
            size="touch"
            className="w-full"
            onClick={() =>
              void signIn('cevi-db', { callbackUrl: callbackUrl ?? globalThis.location.href })
            }
          >
            <LogIn aria-hidden />
            {readerText('signIn', locale)}
          </Button>
          {children}
        </div>
      }
    />
  );
};
