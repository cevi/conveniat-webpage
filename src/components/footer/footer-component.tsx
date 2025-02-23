import React from 'react';
import { FooterMenuArea } from '@/components/footer/footer-menu-area';
import { FooterCopyrightArea } from '@/components/footer/footer-copyright-area';
import { FooterAppNavBar } from '@/components/footer/footer-app-nav-bar';
import { renderInAppDesign } from '@/utils/render-in-app-design';

export const FooterComponent: React.FC = async () => {
  const isInAppDesign = await renderInAppDesign();

  return (
    <>
      <footer className="h-24 w-full">
        <FooterMenuArea />
        <FooterCopyrightArea />
      </footer>
      {isInAppDesign && <FooterAppNavBar />}
    </>
  );
};
