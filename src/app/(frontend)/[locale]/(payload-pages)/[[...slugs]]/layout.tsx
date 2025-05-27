import { CustomErrorBoundaryFallback } from '@/app/(frontend)/[locale]/(payload-pages)/[[...slugs]]/custom-error-boundary-fallback';
import { NotFound } from '@/app/(frontend)/not-found';
import type { ReactNode } from 'react';
import React from 'react';
import { ErrorBoundary } from 'react-error-boundary';

interface LayoutProperties {
  children: ReactNode;
}

const Layout: React.FC<LayoutProperties> = async ({ children }) => {
  return (
    <ErrorBoundary
      fallback={
        <CustomErrorBoundaryFallback>
          <NotFound />
        </CustomErrorBoundaryFallback>
      }
    >
      {children}
    </ErrorBoundary>
  );
};

export default Layout;
