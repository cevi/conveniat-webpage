import type { ReactNode } from 'react';
import React from 'react';

// These styles apply to every route in the application
import './globals.css';
import { FooterComponent } from '@/components/footer/footer-component';
import { HeaderComponent } from '@/components/header-component';
import { CeviBackgroundLogo } from '@/components/svg-logos/cevi-background-logo';

type LayoutProperties = {
  children: ReactNode;
};

const Layout: React.FC<LayoutProperties> = ({ children }) => {
  return (
    <html>
      <body className="flex h-screen flex-col">
        <HeaderComponent />

        <div className="fixed top-0 z-[-999] h-screen w-screen p-[56px]">
          <CeviBackgroundLogo className="mx-auto h-full w-full max-w-[384px]" />
        </div>

        <main className="grow">{children}</main>

        <FooterComponent />
      </body>
    </html>
  );
};

export default Layout;

// configure the viewport and metadata
export { generateViewport } from '@/utils/generate-viewport';
export { generateMetadata } from '@/utils/generate-metadata';
