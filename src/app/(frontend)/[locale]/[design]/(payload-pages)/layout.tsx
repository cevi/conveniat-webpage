import { FooterComponent } from '@/components/footer/footer-component';
import { SetDynamicPageTitle } from '@/components/header/set-dynamic-app-title';
import type { Locale } from '@/types/types';
import { DesignCodes } from '@/utils/design-codes';
import type { ReactNode } from 'react';
import React from 'react';

interface LayoutProperties {
  children: ReactNode;
  params: Promise<{ locale: Locale; design: DesignCodes }>;
}

const Layout: React.FC<LayoutProperties> = async ({ children, params }) => {
  const { locale, design } = await params;
  const isInAppDesign = design === DesignCodes.APP_DESIGN;

  return (
    <>
      <SetDynamicPageTitle newTitle="conveniat27" />
      <div className="min-h-[calc(100dvh-280px)] min-w-full overflow-x-hidden pt-8 pb-24 min-[1280px]:px-12 min-[1800px]:px-18 min-[2400px]:px-96">
        {children}
      </div>
      <div></div>
      <FooterComponent locale={locale} inAppDesign={isInAppDesign} />
    </>
  );
};

export default Layout;
