import { FooterComponent } from '@/components/footer/footer-component';
import { SetDynamicPageTitle } from '@/components/header/set-dynamic-app-title';
import type { ReactNode } from 'react';
import React from 'react';

interface LayoutProperties {
  children: ReactNode;
}

const Layout: React.FC<LayoutProperties> = ({ children }) => {
  return (
    <>
      <SetDynamicPageTitle newTitle="conveniat27" />
      <div className="min-h-[calc(100dvh-280px)] min-w-full overflow-x-hidden pt-8 pb-24 min-[1280px]:px-12 min-[1800px]:px-18 min-[2400px]:px-96">
        {children}
      </div>
      <div></div>
      <FooterComponent />
    </>
  );
};

export default Layout;
