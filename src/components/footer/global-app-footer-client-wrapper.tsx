'use client';

import { ShowGetTheAppButton } from '@/components/get-the-app';
import { i18nConfig } from '@/types/types';
import { usePathname } from 'next/navigation';
import React from 'react';

interface Properties {
  appNavBar: React.ReactNode;
  copyrightArea: React.ReactNode;
  isAppMode: boolean;
}

/**
 * Client-side wrapper for the global footer to handle dynamic visibility during navigation. On the
 * app's pages in a browser it leaves the bottom free and offers the app in the header instead.
 */
export const GlobalAppFooterClientWrapper: React.FC<Properties> = ({
  appNavBar,
  copyrightArea,
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

  // No copyright area on app pages. Decided from the path rather than from state a page sets
  // after mounting: the server and the browser then agree on what this streamed footer holds.
  if (isAppPath) return <ShowGetTheAppButton />;

  // Otherwise, render normal browser CMS footer
  return <>{copyrightArea}</>;
};
