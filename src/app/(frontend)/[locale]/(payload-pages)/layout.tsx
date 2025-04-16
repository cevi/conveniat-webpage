import React, { ReactNode } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import ErrorPage from '@/app/(frontend)/error';
import { FooterComponent } from '@/components/footer/footer-component';

type LayoutProperties = {
  children: ReactNode;
};

const Layout: React.FC<LayoutProperties> = async ({ children }) => {
  return (
    <>
      <ErrorBoundary
        fallback={<ErrorPage error={new Error('main content failed to render at payload page')} />}
      >
        <main className="mt-[96px] grow">{children}</main>
      </ErrorBoundary>

      <FooterComponent />
    </>
  );
};

export default Layout;
