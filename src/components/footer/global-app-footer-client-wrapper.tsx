'use client';

import { AppAdvertisement } from '@/components/app-advertisement';
import type { Locale } from '@/types/types';
import { usePathname } from 'next/navigation';
import React from 'react';

interface Properties {
  children: React.ReactNode;
  locale: Locale;
  isAppMode: boolean;
}

/**
 * Client-side wrapper for the global footer to handle dynamic visibility during navigation.
 * It ensures the App Advertisement disappears when navigating away from /app/* routes.
 */
export const GlobalAppFooterClientWrapper: React.FC<Properties> = ({
  children,
  locale,
  isAppMode,
}) => {
  const pathname = usePathname();
  const isAppPath = pathname.split('/').includes('app');

  // If we are in real app mode, the Navbar is always visible globally
  if (isAppMode) {
    return <>{children}</>;
  }

  // If we are on an app path in browser mode, show the advertisement
  if (isAppPath) {
    let type: 'map' | 'chat' | 'generic' = 'generic';
    if (pathname.includes('/app/map')) {
      type = 'map';
    } else if (pathname.includes('/app/chat')) {
      type = 'chat';
    }

    return <AppAdvertisement locale={locale} type={type} />;
  }

  // Otherwise, render nothing (normal browser CMS pages)
  return;
};
