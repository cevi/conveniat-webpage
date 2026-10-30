'use client';

import { AppAdvertisement } from '@/components/app-advertisement';
import type { Locale } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { usePathname } from 'next/navigation';
import React from 'react';

interface Properties {
  appNavBar: React.ReactNode;
  copyrightArea: React.ReactNode;
  locale: Locale;
  isAppMode: boolean;
}

/**
 * Client-side wrapper for the global footer to handle dynamic visibility during navigation.
 * It ensures the App Advertisement disappears when navigating away from /app/* routes.
 */
export const GlobalAppFooterClientWrapper: React.FC<Properties> = ({
  appNavBar,
  copyrightArea,
  locale,
  isAppMode,
}) => {
  const pathname = usePathname();
  // `/app/...` after an optional locale prefix. A CMS page may carry `app` further down its slug,
  // and that one keeps its footer.
  const [first, second] = pathname.split('/').filter((segment) => segment !== '');
  const isAppPath = (i18nConfig.locales.includes(first ?? '') ? second : first) === 'app';

  // If we are in real app mode, the Navbar is always visible globally
  if (isAppMode) {
    return <>{appNavBar}</>;
  }

  // If we are on an app path in browser mode, show the advertisement
  if (isAppPath) {
    let type: 'map' | 'chat' | 'generic' = 'generic';
    if (pathname.includes('/app/map')) {
      type = 'map';
    } else if (pathname.includes('/app/chat')) {
      type = 'chat';
    }

    // No copyright area on app pages. Decided from the path rather than from state a page sets
    // after mounting: the server and the browser then agree on what this streamed footer holds.
    return <AppAdvertisement locale={locale} type={type} />;
  }

  // Otherwise, render normal browser CMS footer
  return <>{copyrightArea}</>;
};
