'use client';
import { PreviewModeToggle } from '@/components/header/preview-mode-toggler';
import type { Locale } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { PREVIEW_SESSION_COOKIE } from '@/utils/preview-session-cookie';
import Cookies from 'js-cookie';
import { RefreshCw, X } from 'lucide-react';
import type { User } from 'next-auth';
import { useCurrentLocale } from 'next-i18n-router/client';
import { useSearchParams } from 'next/navigation';
import React, { useState } from 'react';

interface PreviewModeBannerProperties {
  user: User | undefined;
  canAccessAdmin: boolean;
}

/**
 *
 * The preview mode banner is a small gray banner at the top of the screen and
 * is visible whenever the user is viewing at a page in preview mode.
 * The preview banner is part of the previewing system.
 *
 */
export const PreviewModeBanner: React.FC<PreviewModeBannerProperties> = ({
  user,
  canAccessAdmin,
}) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const searchParameters = useSearchParams();
  const [isReloading, setIsReloading] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Fix React hydration mismatch: useSearchParams() differs between static SSR and client.
  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  // Until hydration completes, we do not render anything to avoid mismatch with SSR
  if (!isMounted) return <></>;

  const tokenParameter = searchParameters.get('preview-token');
  const accessWithToken = tokenParameter !== null && tokenParameter.length > 0;

  const renderPreviewModeBanner = accessWithToken || canAccessAdmin;

  // abort, don't render the preview banner...
  if (!renderPreviewModeBanner || isDismissed) return <></>;

  const StaticTranslationStrings = {
    account: {
      de: 'Account: ',
      en: 'Account: ',
      fr: 'Compte: ',
    },
    anonymous: {
      de: 'anonym',
      en: 'anonymous',
      fr: 'anonyme',
    },
    previewMode: {
      de: 'Vorschau:',
      en: 'Preview:',
      fr: 'Aperçu:',
    },
  };

  // we set the email to 'anonymous' if the user is not signed
  const { email: userEmail } = user ?? { email: StaticTranslationStrings.anonymous[locale] };

  const handleReload = (): void => {
    setIsReloading(true);
    globalThis.location.reload();
  };

  const handleDismiss = (): void => {
    // Delete the session cookie
    Cookies.remove(PREVIEW_SESSION_COOKIE, { path: '/' });
    setIsDismissed(true);
  };

  return (
    <div className="relative z-[200] flex h-[32px] items-center justify-between overflow-hidden bg-gray-900 px-4 md:px-8">
      <span className="flex items-center text-xs text-gray-100">
        <span className="text-gray-300 max-sm:hidden">
          {StaticTranslationStrings.account[locale]}
        </span>
        <span className="ml-1 font-medium">{userEmail}</span>
      </span>
      <div className="flex items-center space-x-2">
        <span className="text-xs text-gray-300">
          {StaticTranslationStrings.previewMode[locale]}
        </span>
        <PreviewModeToggle />
      </div>

      <div className="flex flex-row gap-x-4">
        <RefreshCw
          className={`h-4 w-4 cursor-pointer text-gray-300 ${isReloading ? 'animate-spin' : ''}`}
          onClick={handleReload}
        />
        <button onClick={handleDismiss} title="Exit preview mode">
          <X className="h-4 w-4 cursor-pointer text-gray-300 hover:text-white" />
        </button>
      </div>
    </div>
  );
};
