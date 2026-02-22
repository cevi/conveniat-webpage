import { SetDynamicPageTitle } from '@/components/header/set-dynamic-app-title';
import type { Locale } from '@/types/types';
import { DesignCodes } from '@/utils/design-codes';
import type { ReactNode } from 'react';
import React from 'react';

interface LayoutProperties {
  children: ReactNode;
}

const Layout: React.FC<LayoutProperties> = ({ children }) => {
  return (
    <>
      <SetDynamicPageTitle newTitle="conveniat27" />
      <div className="min-w-full overflow-x-hidden pt-8 pb-24 xl:px-12">{children}</div>
    </>
  );
};

export const generateStaticParams = (): { locale: Locale; design: DesignCodes }[] => {
  const designs: DesignCodes[] = [DesignCodes.WEB_DESIGN, DesignCodes.APP_DESIGN];
  const locales: Locale[] = ['de', 'fr', 'en'];

  return designs.flatMap((design) => locales.map((locale) => ({ locale, design })));
};

export default Layout;
