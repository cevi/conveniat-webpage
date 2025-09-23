import { FooterAppNavBar } from '@/components/footer/footer-app-nav-bar';
import { FooterCopyrightArea } from '@/components/footer/footer-copyright-area';
import { FooterMenuArea } from '@/components/footer/footer-menu-area';
import type { Locale } from '@/types/types';
import React from 'react';

export const FooterComponent: React.FC<{
  locale: Locale;
  inAppDesign: boolean;
}> = async ({ locale, inAppDesign: isInAppDesign }) => {
  return (
    <>
      <footer className="w-full">
        <FooterMenuArea locale={locale} />
        <FooterCopyrightArea locale={locale} inAppDesign={isInAppDesign} />
      </footer>
      {isInAppDesign && <FooterAppNavBar locale={locale} />}
    </>
  );
};
