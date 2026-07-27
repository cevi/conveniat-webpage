import { FooterAppNavBar } from '@/components/footer/footer-app-nav-bar';
import { resolveAppNavBarEntries } from '@/components/footer/footer-nav-bar-menu-entries';
import { getFooterCached } from '@/features/payload-cms/api/cached-globals';
import type { Locale } from '@/types/types';
import { ForceDynamicOnBuild } from '@/utils/is-pre-rendering';
import { cacheLife, cacheTag } from 'next/cache';
import type React from 'react';

const AppNavBarCached: React.FC<{ locale: Locale }> = async ({ locale }) => {
  'use cache';
  cacheLife('hours');
  cacheTag('payload', 'footer');

  const footerData = await getFooterCached(locale);
  const appNavBarItems = resolveAppNavBarEntries(footerData.appNavBarMenu, locale);

  return <FooterAppNavBar locale={locale} items={appNavBarItems} />;
};

export const AppNavBarServer: React.FC<{ locale: Locale }> = ({ locale }) => {
  return (
    <ForceDynamicOnBuild>
      <AppNavBarCached locale={locale} />
    </ForceDynamicOnBuild>
  );
};
