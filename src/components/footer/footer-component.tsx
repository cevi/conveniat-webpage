import { FooterAppNavBar } from '@/components/footer/footer-app-nav-bar';
import { FooterCopyrightArea } from '@/components/footer/footer-copyright-area';
import { FooterMenuArea } from '@/components/footer/footer-menu-area';
import { getLocaleFromCookies } from '@/utils/get-locale-from-cookies';
import { renderInAppDesign } from '@/utils/render-in-app-design';
import React from 'react';

export const FooterComponent: React.FC = async () => {
  const isInAppDesign = await renderInAppDesign();
  const locale = await getLocaleFromCookies();

  return (
    <>
      <footer className="h-24 w-full">
        <FooterMenuArea />
        <FooterCopyrightArea />
      </footer>
      {isInAppDesign && <FooterAppNavBar locale={locale} />}
    </>
  );
};
