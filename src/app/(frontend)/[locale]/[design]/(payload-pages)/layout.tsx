import { DEFAULT_APP_TITLE } from '@/components/header/dynamic-app-title-name';
import { SetDynamicPageTitle } from '@/components/header/set-dynamic-app-title';
import type { Locale } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { DesignCodes } from '@/utils/design-codes';
import type { ReactNode } from 'react';
import React from 'react';

interface LayoutProperties {
  children: ReactNode;
}

const Layout: React.FC<LayoutProperties> = ({ children }) => {
  return (
    <>
      <SetDynamicPageTitle newTitle={DEFAULT_APP_TITLE} />
      <div className="min-w-full overflow-x-hidden pt-8 pb-24 xl:px-12">{children}</div>
    </>
  );
};

export const generateStaticParams = (): { locale: Locale; design: DesignCodes }[] => {
  const designs: DesignCodes[] = [DesignCodes.WEB_DESIGN, DesignCodes.APP_DESIGN];
  const locales = i18nConfig.locales as Locale[];

  return designs.flatMap((design) => locales.map((locale) => ({ locale, design })));
};

export default Layout;
