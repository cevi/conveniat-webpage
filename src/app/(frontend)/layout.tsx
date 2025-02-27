import React, { ReactNode } from 'react';

// These styles apply to every route in the application
import './globals.scss';
import { FooterComponent } from '@/components/footer/footer-component';
import { HeaderComponent } from '@/components/header/header-component';
import { ErrorBoundary } from 'react-error-boundary';
import ErrorPage from '@/app/(frontend)/error';
import { Inter, Montserrat } from 'next/font/google';
import { getLocaleFromCookies } from '@/utils/get-locale-from-cookies';
import { CeviLogo } from '@/components/svg-logos/cevi-logo';

type LayoutProperties = {
  children: ReactNode;
};

const montserrat = Montserrat({
  subsets: ['latin'],
});
const inter = Inter({
  subsets: ['latin'],
});

const RootLayout: React.FC<LayoutProperties> = async ({ children }) => {
  const locale = await getLocaleFromCookies();

  return (
    <html className={`${montserrat.className} ${inter.className}`} lang={locale}>
      <body className="flex h-screen flex-col bg-[#f8fafc]">
        <HeaderComponent />

        <div className="absolute top-0 z-[-999] h-screen w-full p-[56px]">
          <CeviLogo className="mx-auto h-full max-h-[60vh] w-full max-w-[384px] opacity-10 blur-md" />
        </div>

        <ErrorBoundary
          fallback={<ErrorPage error={new Error('main content failed to render at root layout')} />}
        >
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
