import { FooterCopyrightArea } from '@/components/footer/footer-copyright-area';
import { FooterMenuArea } from '@/components/footer/footer-menu-area';
import React from 'react';

export const FooterComponent: React.FC = () => {
  return (
    <footer className="h-24 w-full">
      <FooterMenuArea />
      <FooterCopyrightArea />
    </footer>
  );
};
