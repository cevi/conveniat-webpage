'use client';
import React, { useEffect, useState } from 'react';
import { User } from 'next-auth';
import { useSearchParams } from 'next/navigation';
import { PreviewModeToggle } from '@/components/header/preview-mode-toggler';

interface PreviewModeBannerProperties {
  user: User | undefined;
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
export const PreviewModeBanner: React.FC<PreviewModeBannerProperties> = ({ user }) => {
  const searchParameters = useSearchParams();

  const [renderPreviewModeBanner, setRenderPreviewModeBanner] = useState(false);

  useEffect(() => {
    const tokenParameter = searchParameters.get('preview-token');
    const hasValidPreviewToken = tokenParameter !== null && tokenParameter.length > 0;
    const isPreviewCookieSet = document.cookie.includes('preview=true');
    setRenderPreviewModeBanner(hasValidPreviewToken || isPreviewCookieSet);
  }, [searchParameters]);

  // abort, don't render the preview banner...
  if (!renderPreviewModeBanner) return <></>;

  // we set the email to 'anonymous' if the user is not signed in
  const { email: userEmail } = user ?? { email: 'anonymous' };

  return (
    <div className="relative z-[200] flex h-[32px] items-center justify-between bg-gray-900 px-1 md:px-8">
      <span className="flex items-center text-xs text-gray-100">
        <span className="text-gray-300 max-sm:hidden">Account: </span>
        <span className="ml-1 font-medium">{userEmail}</span>
      </span>
      <div className="flex items-center space-x-2">
        <span className="text-xs text-gray-300">Preview&nbsp;Mode:</span>
        <PreviewModeToggle />
      </div>
    </div>
  );
};
