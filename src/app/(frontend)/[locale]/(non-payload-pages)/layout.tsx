import React, { ReactNode } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import ErrorPage from '@/app/(frontend)/error';

import { FooterAppNavBar } from '@/components/footer/footer-app-nav-bar';
import { renderInAppDesign } from '@/utils/render-in-app-design';
import { getLocaleFromCookies } from '@/utils/get-locale-from-cookies';

type LayoutProperties = {
  children: ReactNode;
};

const Layout: React.FC<LayoutProperties> = async ({ children }) => {
  const isInAppDesign = await renderInAppDesign();
  const locale = await getLocaleFromCookies();

  return (
    <>
      <ErrorBoundary
        fallback={<ErrorPage error={new Error('main content failed to render at root layout')} />}
      >
        <main className="mt-[60px] grow pb-20">{children}</main>
      </ErrorBoundary>

      {isInAppDesign && <FooterAppNavBar locale={locale} />}
    </>
  );
};

export default Layout;
