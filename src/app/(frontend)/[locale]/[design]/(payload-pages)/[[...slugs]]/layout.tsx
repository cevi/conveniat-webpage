import { NotFound } from '@/app/(frontend)/(not-found)/not-found';
import { CustomErrorBoundaryFallback } from '@/app/(frontend)/[locale]/[design]/(payload-pages)/[[...slugs]]/custom-error-boundary-fallback';
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

export const revalidate = 3600;
export const dynamic = 'force-static';
export default Layout;
