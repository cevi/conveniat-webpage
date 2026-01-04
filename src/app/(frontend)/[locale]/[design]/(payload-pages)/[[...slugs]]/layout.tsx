import { NotFound } from '@/app/(frontend)/(not-found)/not-found';
import { CustomErrorBoundaryFallback } from '@/app/(frontend)/[locale]/[design]/(payload-pages)/[[...slugs]]/custom-error-boundary-fallback';
import { SafeErrorBoundary } from '@/components/error-boundary/safe-error-boundary';
import type { Locale } from '@/types/types';
import type { ReactNode } from 'react';
import React from 'react';

interface LayoutProperties {
  children: ReactNode;
  params: Promise<{ locale: Locale }>;
}

const Layout: React.FC<LayoutProperties> = ({ children, params }) => {
  const locale = params.then((p) => p.locale);
  return (
    <SafeErrorBoundary
      fallback={
        <CustomErrorBoundaryFallback>
          <NotFound locale={locale} />
        </CustomErrorBoundaryFallback>
      }
    >
      {children}
    </SafeErrorBoundary>
  );
};

export default Layout;
