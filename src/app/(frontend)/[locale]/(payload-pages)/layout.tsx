import { FooterComponent } from '@/components/footer/footer-component';
import type { ReactNode } from 'react';
import React from 'react';

interface LayoutProperties {
  children: ReactNode;
}

const Layout: React.FC<LayoutProperties> = async ({ children }) => {
  return (
    <>
      <div className="min-h-full min-w-full overflow-x-hidden pt-8 pb-24 min-[1280px]:px-12 min-[1800px]:px-18 min-[2400px]:px-96">
        {children}
      </div>
      <div></div>
      <FooterComponent />
    </>
  );
};

export default Layout;
