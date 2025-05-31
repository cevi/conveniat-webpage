import { FooterComponent } from '@/components/footer/footer-component';
import type { ReactNode } from 'react';
import React from 'react';

interface LayoutProperties {
  children: ReactNode;
}

const Layout: React.FC<LayoutProperties> = async ({ children }) => {
  return (
    <>
      <div className="xl:px-12 overflow-x-hidden min-h-full min-w-full">{children}</div>
      <div></div>
      <FooterComponent />
    </>
  );
};

export default Layout;
