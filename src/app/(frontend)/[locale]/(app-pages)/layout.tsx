import type { ReactNode } from 'react';
import React from 'react';

import { FooterAppNavBar } from '@/components/footer/footer-app-nav-bar';
import { getLocaleFromCookies } from '@/utils/get-locale-from-cookies';
import { renderInAppDesign } from '@/utils/render-in-app-design';
import { SessionProvider } from 'next-auth/react';

interface LayoutProperties {
  children: ReactNode;
}

const Layout: React.FC<LayoutProperties> = async ({ children }) => {
  const isInAppDesign = await renderInAppDesign();
  const locale = await getLocaleFromCookies();

  return (
    <>
      <SessionProvider>{children}</SessionProvider>
      <div></div>
      {isInAppDesign && <FooterAppNavBar locale={locale} />}
    </>
  );
};

export default Layout;
