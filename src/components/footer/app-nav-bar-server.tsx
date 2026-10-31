import { FooterAppNavBar } from '@/components/footer/footer-app-nav-bar';
import { resolveAppNavBarEntries } from '@/components/footer/footer-nav-bar-menu-entries';
import { getFooterCached } from '@/features/payload-cms/api/cached-globals';
import type { Locale } from '@/types/types';
import { ForceDynamicOnBuild } from '@/utils/is-pre-rendering';
import { cacheLife, cacheTag } from 'next/cache';
import type React from 'react';

interface AppNavBarProperties {
  locale: Locale;
  /** with the website's top menu, the tabs stand on the left of a desktop screen */
  railOnDesktop: boolean;
}

const AppNavBarCached: React.FC<AppNavBarProperties> = async ({ locale, railOnDesktop }) => {
  'use cache';
  cacheLife('hours');
  cacheTag('payload', 'footer');

  const footerData = await getFooterCached(locale);
  const appNavBarItems = resolveAppNavBarEntries(footerData.appNavBarMenu, locale);

  return <FooterAppNavBar locale={locale} items={appNavBarItems} railOnDesktop={railOnDesktop} />;
};

export const AppNavBarServer: React.FC<AppNavBarProperties> = ({ locale, railOnDesktop }) => {
  return (
    <ForceDynamicOnBuild>
      <AppNavBarCached locale={locale} railOnDesktop={railOnDesktop} />
    </ForceDynamicOnBuild>
  );
};
