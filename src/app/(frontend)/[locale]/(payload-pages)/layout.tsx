import { FooterComponent } from '@/components/footer/footer-component';
import type { ReactNode } from 'react';
import React from 'react';

interface LayoutProperties {
  children: ReactNode;
}

const Layout: React.FC<LayoutProperties> = async ({ children }) => {
  return (
    <>
      {children}
      <FooterComponent />
    </>
  );
};

export default Layout;
