import { CustomErrorBoundaryFallback } from '@/app/(frontend)/[locale]/[design]/(payload-pages)/[[...slugs]]/custom-error-boundary-fallback';
import { NotFound } from '@/app/(frontend)/not-found';
import type { Locale } from '@/types/types';
import type { ReactNode } from 'react';
import React from 'react';
import { ErrorBoundary } from 'react-error-boundary';

interface LayoutProperties {
  children: ReactNode;
  params: Promise<{ locale: Locale }>;
}

const Layout: React.FC<LayoutProperties> = async ({ children, params }) => {
  const { locale } = await params;

  return (
    <ErrorBoundary
      fallback={
        <CustomErrorBoundaryFallback>
          <NotFound locale={locale} />
        </CustomErrorBoundaryFallback>
      }
    >
      {children}
    </ErrorBoundary>
  );
};

export default Layout;
