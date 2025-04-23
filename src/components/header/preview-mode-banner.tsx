'use client';
import { PreviewModeToggle } from '@/components/header/preview-mode-toggler';
import type { Locale } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { RefreshCw } from 'lucide-react';
import type { User } from 'next-auth';
import { useCurrentLocale } from 'next-i18n-router/client';
import { useSearchParams } from 'next/navigation';
import React, { useEffect, useState } from 'react';

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
 * The preview banner cannot be closed while a page in preview mode is visited.
 * If the visiting user is a Payload admin (e.g. a user that can access the admin panel).
 * The preview banner becomes visible as soon as the user has signed in to the Payload CMS and
 * visited the admin panel (see middleware.ts).
 *
 * The preview banner can be closed (e.g. hidden away) whenever a non-preview page is accessed.
 * The preview banner of a non-payload admin is only visible on the specific page that is in preview mode.
 *
 */
export const PreviewModeBanner: React.FC<PreviewModeBannerProperties> = ({
  user,
  canAccessAdmin,
}) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const searchParameters = useSearchParams();

  const [renderPreviewModeBanner, setRenderPreviewModeBanner] = useState(false);

  useEffect(() => {
    // check preview token
    const tokenParameter = searchParameters.get('preview-token');
    const accessWithToken = tokenParameter !== null && tokenParameter.length > 0;

    // check if cookie is set and user is a Payload admin
    const isPreviewCookieSet = document.cookie.includes('preview=true');
    const accessWithCookie = isPreviewCookieSet && canAccessAdmin;

    // we render the preview banner if...
    // ... the user is a Payload admin and the preview cookie is set,
    // ... or, the user has a valid preview token (e.g., the preview-token query parameter is set),
    // access control is handled by the render logic of the page.
    setRenderPreviewModeBanner(accessWithToken || accessWithCookie);
  }, [searchParameters, canAccessAdmin]);

  // abort, don't render the preview banner...
  if (!renderPreviewModeBanner) return <></>;

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

  // we set the email to 'anonymous' if the user is not signed in
  const { email: userEmail } = user ?? { email: StaticTranslationStrings.anonymous[locale] };

  return (
    <div className="relative z-[200] flex h-[32px] items-center justify-between overflow-hidden bg-gray-900 px-1 md:px-8">
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
      <RefreshCw
        className="h-4 w-4 cursor-pointer text-gray-300"
        onClick={() => globalThis.location.reload()}
      />
    </div>
  );
};
