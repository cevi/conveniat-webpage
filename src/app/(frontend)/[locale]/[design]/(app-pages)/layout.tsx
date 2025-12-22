import type { ReactNode } from 'react';
import React, { Suspense } from 'react';

import { FooterAppNavBar } from '@/components/footer/footer-app-nav-bar';
import { StarProvider } from '@/context/star-context';
import type { Locale } from '@/types/types';
import { DesignCodes } from '@/utils/design-codes';
import { SessionProvider } from 'next-auth/react';

import { FooterClientWrapper } from '@/components/footer/footer-client-wrapper';
import { HideFooterProvider } from '@/components/footer/hide-footer-context';

interface LayoutProperties {
  children: ReactNode;
  params: Promise<{
    locale: Locale;
    design: DesignCodes;
  }>;
}

const AppLayout: React.FC<LayoutProperties> = async ({ children, params }) => {
  const { locale, design } = await params;
  const isInAppDesign = design === DesignCodes.APP_DESIGN;

  return (
    <HideFooterProvider>
      <StarProvider>
        <SessionProvider>
          <div className="mb-20">{children}</div>
        </SessionProvider>
        <div></div>
        <FooterClientWrapper>
          <Suspense>{isInAppDesign && <FooterAppNavBar locale={locale} />}</Suspense>
        </FooterClientWrapper>
      </StarProvider>
    </HideFooterProvider>
  );
};

export const generateStaticParams = (): { locale: Locale; design: DesignCodes }[] => {
  const designs: DesignCodes[] = [DesignCodes.APP_DESIGN];
  const locales: Locale[] = ['de', 'fr', 'en'];

  return designs.flatMap((design) => locales.map((locale) => ({ locale, design })));
};

export default AppLayout;
