import type { ReactNode } from 'react';
import React from 'react';

import { FooterAppNavBar } from '@/components/footer/footer-app-nav-bar';
import { StarProvider } from '@/context/star-context';
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
      <StarProvider>
        <SessionProvider>
          <div className="mb-20">{children}</div>
        </SessionProvider>
        <div></div>
        {isInAppDesign && <FooterAppNavBar locale={locale} />}
      </StarProvider>
    </>
  );
};

export default Layout;
