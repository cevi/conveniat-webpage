import { FooterAppNavBar } from '@/components/footer/footer-app-nav-bar';
import { FooterCopyrightArea } from '@/components/footer/footer-copyright-area';
import type { Locale } from '@/types/types';
import React, { Suspense } from 'react';

export const FooterComponent: React.FC<{
  locale: Locale;
  inAppDesign: boolean;
}> = async ({ locale, inAppDesign: isInAppDesign }) => {
  return (
    <>
      <footer className="w-full">
        <FooterCopyrightArea locale={locale} inAppDesign={isInAppDesign} />
      </footer>
      <Suspense>{isInAppDesign && <FooterAppNavBar locale={locale} />}</Suspense>
    </>
  );
};
