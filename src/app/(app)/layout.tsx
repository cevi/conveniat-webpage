import type { ReactNode } from 'react';
import React from 'react';

// These styles apply to every route in the application
import './globals.css';
import { FooterComponent } from '@/components/footer/footer-component';
import { HeaderComponent } from '@/components/header-component';

type LayoutProperties = {
  children: ReactNode;
};

const Layout: React.FC<LayoutProperties> = ({ children }) => {
  return (
    <html lang="de-CH">
      <body className="bg-background">
        <HeaderComponent />
        <main className="mt-16">{children}</main>
        <FooterComponent />
      </body>
    </html>
  );
};

export default Layout;

// configure the viewport and metadata
export { generateViewport } from '@/utils/generate-viewport';
export { generateMetadata } from '@/utils/generate-metadata';
