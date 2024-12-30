import type { ReactNode } from 'react';
import React from 'react';

// These styles apply to every route in the application
import './globals.scss';
import { FooterComponent } from '@/components/footer/footer-component';
import { HeaderComponent } from '@/components/header/header-component';
import { CeviBackgroundLogo } from '@/components/svg-logos/cevi-background-logo';
import { ErrorBoundary } from 'react-error-boundary';
import ErrorPage from '@/app/(frontend)/error';
import { Inter, Montserrat } from 'next/font/google';

type LayoutProperties = {
  children: ReactNode;
};

const montserrat = Montserrat({
  subsets: ['latin'],
});
const inter = Inter({
  subsets: ['latin'],
});

const RootLayout: React.FC<LayoutProperties> = ({ children }) => {
  return (
    <html className={`${montserrat.className} ${inter.className}`}>
      <body className="flex h-screen flex-col">
        <HeaderComponent />

        <div className="fixed top-0 z-[-999] h-screen w-screen p-[56px]">
          <CeviBackgroundLogo className="mx-auto h-full w-full max-w-[384px]" />
        </div>

        <ErrorBoundary fallback={<ErrorPage />}>
          <main className="mt-[112px] grow">{children}</main>
        </ErrorBoundary>

        <FooterComponent />
      </body>
    </html>
  );
};

export default RootLayout;

// configure the viewport and metadata
export { generateViewport } from '@/utils/generate-viewport';
export { generateMetadata } from '@/utils/generate-metadata';
