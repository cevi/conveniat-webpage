import { FooterAppNavBar } from '@/components/footer/footer-app-nav-bar';
import { FooterCopyrightArea } from '@/components/footer/footer-copyright-area';
import { FooterCopyrightClientWrapper } from '@/components/footer/footer-copyright-client-wrapper';
import type { Locale } from '@/types/types';
import React from 'react';

export const FooterComponent: React.FC<{
  locale: Promise<Locale>;
  inAppDesign: Promise<boolean>;
}> = async ({ locale: localePromise, inAppDesign: isInAppDesignPromise }) => {
  const [locale, isInAppDesign] = await Promise.all([localePromise, isInAppDesignPromise]);

  return (
    <>
      <footer className="w-full">
        <FooterCopyrightClientWrapper>
          <FooterCopyrightArea locale={locale} inAppDesign={isInAppDesign} />
        </FooterCopyrightClientWrapper>
      </footer>
      {isInAppDesign && (
        <React.Suspense fallback={<></>}>
          <FooterAppNavBar locale={locale} />
        </React.Suspense>
      )}
    </>
  );
};
