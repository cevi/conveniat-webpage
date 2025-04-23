import ErrorPage from '@/app/(frontend)/error';
import type { ReactNode } from 'react';
import React from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import { FooterAppNavBar } from '@/components/footer/footer-app-nav-bar';
import { getLocaleFromCookies } from '@/utils/get-locale-from-cookies';
import { renderInAppDesign } from '@/utils/render-in-app-design';

interface LayoutProperties {
  children: ReactNode;
}

const Layout: React.FC<LayoutProperties> = async ({ children }) => {
  const isInAppDesign = await renderInAppDesign();
  const locale = await getLocaleFromCookies();

  return (
    <>
      <ErrorBoundary
        fallback={
          <ErrorPage error={new Error('main content failed to render at non payload page')} />
        }
      >
        <main className="mt-[60px] grow pb-20">{children}</main>
      </ErrorBoundary>

      {isInAppDesign && <FooterAppNavBar locale={locale} />}
    </>
  );
};

export default Layout;
