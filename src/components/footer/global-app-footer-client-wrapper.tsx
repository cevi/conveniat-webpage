'use client';

import { AppAdvertisement } from '@/components/app-advertisement';
import type { Locale } from '@/types/types';
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
  const isAppPath = pathname.split('/').includes('app');

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

    return (
      <>
        <AppAdvertisement locale={locale} type={type} />
        {copyrightArea}
      </>
    );
  }

  // Otherwise, render normal browser CMS footer
  return <>{copyrightArea}</>;
};
